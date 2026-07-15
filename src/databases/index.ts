import type {Node} from "prosemirror-model"

import type {Editor} from "../types.js"

import {ModBibliographyDB} from "./bibliography.js"
import {ModImageDB} from "./images.js"

interface ModDBImageDB {
    db: Record<string, Record<string, unknown>>
    unsent: unknown[]
    unsentEvents(): unknown[]
    deleteImage(id: string | number): void
    setImage(id: string | number, entry: Record<string, unknown>): void
}

interface ModDBBibDB {
    db: Record<string, Record<string, unknown>>
    unsent: unknown[]
    setDB(value: Record<string, Record<string, unknown>>): void
    deleteReference(id: string | number): void
    findReference(reference: Record<string, unknown>): string | undefined
    addReference(
        reference: Record<string, unknown>,
        id: string | number
    ): string | number
    hasUnsentEvents(): number
}

export class ModDB {
    editor: Editor
    bibDB!: ModDBBibDB
    imageDB!: ModDBImageDB

    constructor(editor: Editor) {
        editor.mod.db = this as unknown as Editor["mod"]["db"]
        this.editor = editor
        new ModBibliographyDB(this)
        new ModImageDB(this)
        // assign bibDB to be used in document schema.
        this.editor.schema.cached.bibDB = this.bibDB
        // assign bibDB to be used in footnote schema.
        ;(
            this.editor.mod.footnotes as {
                fnEditor: {schema: {cached: Record<string, unknown>}}
            }
        ).fnEditor.schema.cached.bibDB = this.bibDB
        // assign image DB to be used in document schema.
        this.editor.schema.cached.imageDB = this.imageDB
        // assign image DB to be used in footnote schema.
        ;(
            this.editor.mod.footnotes as {
                fnEditor: {schema: {cached: Record<string, unknown>}}
            }
        ).fnEditor.schema.cached.imageDB = this.imageDB
    }

    // remove images/citation items that are no longer part of the document.
    clean(): void {
        const usedImages: (number | string)[] = [],
            usedBibs: (number | string)[] = []
        this.editor.view.state.doc.descendants((node: Node) => {
            if (node.type.name === "citation") {
                node.attrs.references.forEach(
                    (ref: {id: number | string}) =>
                        usedBibs.push(Number.parseInt(String(ref.id)))
                )
            } else if (node.type.name === "image" && node.attrs.image) {
                usedImages.push(node.attrs.image)
            }
        })

        ;(
            this.editor.mod.footnotes as {
                fnEditor: {view: {state: {doc: Node}}}
            }
        ).fnEditor.view.state.doc.descendants((node: Node) => {
            if (node.type.name === "citation") {
                node.attrs.references.forEach(
                    (ref: {id: number | string}) =>
                        usedBibs.push(Number.parseInt(String(ref.id)))
                )
            } else if (node.type.name === "image" && node.attrs.image) {
                usedImages.push(node.attrs.image)
            }
        })

        const unusedImages = Object.keys(this.imageDB.db).filter(
                value => !usedImages.includes(Number.parseInt(value))
            ),
            unusedBibs = Object.keys(this.bibDB.db).filter(
                value => !usedBibs.includes(Number.parseInt(value))
            )
        unusedImages.forEach(id => this.imageDB.deleteImage(id))
        unusedBibs.forEach(id => this.bibDB.deleteReference(id))

        const imageDbKeys = Object.keys(this.imageDB.db)
        const missingImages = usedImages.filter(
            id => !imageDbKeys.includes(String(id))
        )
        if (!this.editor.e2ee?.encrypted) {
            missingImages.forEach(id => {
                const userImage = (
                    this.editor.app as {
                        imageDB?: {db: Record<string, Record<string, unknown>>}
                    }
                ).imageDB?.db[id]
                if (!userImage) {
                    // Image is not present. Give up.
                    return
                }
                const imageEntry = JSON.parse(JSON.stringify(userImage))
                this.imageDB.setImage(id, imageEntry)
            })
        }
    }
}
