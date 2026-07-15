/*
 Class to provide similar functionality for the document's imageDB to what the
 user's imageDb provides but using the document's websocket connection.
 Notice: It is not possible to directly upload images via this interface as
 images should not be uploaded via websocket. To add a new image to a document,
 the image needs to be uploaded first to the user's imageDB and can then be
 copied to the doc's imageDB. The IDs used are the same for user and document,
 as they originate from the Image model (not UserImage or DocumentImage).
 For E2EE documents, images are encrypted client-side and uploaded directly
 via a dedicated endpoint to an EncryptedDocumentImage model.
*/
import {addAlert, get, post, postJson} from "fwtoolkit"

import type {Editor} from "../types.js"

interface ImageEntry {
    id?: number
    title: string
    copyright: string
    image: string
    file_type?: string
    original_file_type?: string
    checksum?: number
    cats?: any[]
}

interface ImageInput {
    title: string
    copyright: string
    image?: Blob
    original_file_type?: string
    checksum?: number
}

export class ModImageDB {
    mod: {
        editor: Editor
        [key: string]: any
    }
    db: Record<number, ImageEntry> | false
    unsent: {type: string; id?: number; image?: ImageEntry}[]
    // cats always remain empty, as we don't use categories in doc images
    cats: any[]

    constructor(mod: {editor: Editor; [key: string]: any}) {
        mod.imageDB = this
        this.mod = mod
        this.db = false
        this.unsent = []
        // cats always remain empty, as we don't use categories in doc images
        this.cats = []
    }

    setDB(db: Record<number, ImageEntry>): void {
        this.db = db
        this.unsent = []
    }

    mustSend(): void {
        // Set a timeout so that the update can be combines with other updates
        // if they happen more or less simultaneously.
        window.setTimeout(
            () => (this.mod as any).editor.mod.collab.doc.sendToCollaborators(),
            100
        )
    }

    // This function only makes real sense in the user's imageDB. It is kept here
    // for compatibility reasons.
    getDB(): Promise<any[]> {
        return new Promise(resolve => {
            window.setTimeout(() => resolve([]), 100)
        })
    }

    // Save an image directly for this document (E2EE only).
    // The image file is expected to be already encrypted client-side.
    saveImage(imageData: ImageInput): Promise<number> {
        const isE2EE = this.mod.editor.e2ee?.encrypted === true
        if (!isE2EE) {
            // Non-E2EE documents must use the user's imageDB
            return (this.mod.editor.app as any).imageDB.saveImage(imageData)
        }

        // E2EE path: upload encrypted image directly to the document
        const jsonData: Record<string, any> = {
            doc_id: this.mod.editor.docInfo.id,
            title: imageData.title,
            copyright: imageData.copyright,
            checksum: imageData.checksum || 0
        }
        if (imageData.original_file_type) {
            jsonData.original_file_type = imageData.original_file_type
        }

        const files: Record<string, {file: Blob; filename: string}> = {}
        if (imageData.image) {
            files.image = {
                file: imageData.image,
                filename: imageData.original_file_type
                    ? `image.${imageData.original_file_type.split("/").pop()}`
                    : "image.bin"
            }
        }

        return postJson("/api/document/e2ee_image/", jsonData, files)
            .then(({json}: {json: any}) => {
                const dbEntry: ImageEntry = {
                    id: json.id,
                    title: imageData.title,
                    copyright: imageData.copyright,
                    image: json.image || "",
                    file_type: "application/octet-stream",
                    original_file_type:
                        json.original_file_type ||
                        imageData.original_file_type ||
                        "image/png",
                    checksum: imageData.checksum || 0,
                    cats: []
                }
                ;(this.db as Record<number, ImageEntry>)[json.id] = dbEntry
                this.setImage(json.id, dbEntry)
                return json.id
            })
            .catch(error => {
                addAlert("error", gettext("Could not save encrypted image"))
                throw error
            })
    }

    // Add or update an in the image database both remotely and locally.
    setImage(id: number, imageData: ImageEntry): void {
        this.setLocalImage(id, imageData)
        this.unsent.push({
            type: "update",
            id
        })
        this.mustSend()
    }

    // Add or update an image only locally.
    setLocalImage(id: number, imageData: ImageEntry): void {
        ;(this.db as Record<number, ImageEntry>)[id] = imageData
    }

    deleteImage(id: number): void {
        this.deleteLocalImage(id)
        const wasDeleted = !(this.db as Record<number, ImageEntry>)[id]
        if (wasDeleted && this.mod.editor.e2ee?.encrypted) {
            // For E2EE documents, also delete the encrypted image record
            // from the server. The diff-based delete is only for client
            // sync; the server cannot decrypt it to know what to remove.
            this.deleteE2EEImageFromServer(id)
        }
        this.unsent.push({
            type: "delete",
            id
        })
        this.mustSend()
    }

    deleteE2EEImageFromServer(id: number): void {
        post("/api/document/delete_e2ee_image/", {
            doc_id: this.mod.editor.docInfo.id,
            image_id: id
        }).catch(() => {
            // Silently ignore — orphaned image records are acceptable
        })
    }

    deleteLocalImage(id: number): void {
        const usedImages: number[] = []
        this.mod.editor.view.state.doc.descendants(node => {
            if (node.type.name === "figure" && node.attrs.image) {
                usedImages.push(node.attrs.image)
            }
        })
        if (!usedImages.includes(Number.parseInt(String(id)))) {
            delete (this.db as Record<number, ImageEntry>)[id]
            return
        }
        if (this.mod.editor.e2ee?.encrypted === true) {
            // E2EE images are per-document. If the image is still used in the
            // document, keep the local entry as-is. We cannot recover from the
            // shared user image DB because E2EE images are encrypted with this
            // document's unique key and are not reusable across documents.
            return
        }
        const appImageDB = (this.mod.editor.app as any).imageDB
        if (Object.keys(appImageDB.db).includes(String(id))) {
            // Just directly reset the image as we already have the image present in user Image DB
            this.setImage(id, appImageDB.db[id])
        } else {
            // If image is not present in both the userImage DB and docDB we can safely assume that we have to upload again.
            this.reUploadImage(
                id,
                (this.db as Record<number, ImageEntry>)[id].image,
                (this.db as Record<number, ImageEntry>)[id].title,
                (this.db as Record<number, ImageEntry>)[id].copyright
            ).then(
                () => delete (this.db as Record<number, ImageEntry>)[id],
                () => {
                    delete (this.db as Record<number, ImageEntry>)[id]
                    const transaction = this.mod.editor.view.state.tr
                    this.mod.editor.view.state.doc.descendants((node, pos) => {
                        if (
                            node.type.name === "figure" &&
                            node.attrs.image == id
                        ) {
                            const attrs = Object.assign({}, node.attrs) as Record<string, any>
                            attrs["image"] = false
                            const nodeType =
                                this.mod.editor.currentView.state.schema.nodes[
                                    "figure"
                                ]
                            transaction.setNodeMarkup(pos, nodeType, attrs)
                        }
                    })
                    this.mod.editor.view.dispatch(transaction)
                    addAlert(
                        "error",
                        gettext(
                            "One of the Image(s) you copied could not be found on the server. Please try uploading it again."
                        )
                    )
                }
            )
        }
    }

    reUploadImage(
        id: number,
        imageUrl: string,
        title: string,
        copyright: string
    ): Promise<{id: number; newId: number}> {
        const isE2EE = this.mod.editor.e2ee?.encrypted === true
        if (isE2EE) {
            // E2EE images cannot be re-uploaded from a URL because the server
            // stores encrypted opaque bytes. If the image is missing locally,
            // the user must re-insert it manually.
            return Promise.reject(id)
        }

        const newPromise = new Promise<{id: number; newId: number}>(
            (resolve, reject) => {
                // Depends on the fact that service worker is working and cached the image basically.
                get(imageUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        const filename = imageUrl.split("/").pop() || "image"
                        const file = new File([blob], filename, {type: blob.type})
                        const x = {
                            image: file,
                            title: title,
                            cats: [],
                            copyright: copyright
                        }
                        ;(this.mod.editor.app as any).imageDB.saveImage(x).then(
                            (newId: number) => {
                                const imageData = JSON.parse(
                                    JSON.stringify(
                                        (this.mod.editor.app as any).imageDB.db[
                                            newId
                                        ]
                                    )
                                )
                                this.setImage(newId, imageData)
                                this.mod.editor.view.state.doc.descendants(
                                    (node, pos) => {
                                        if (
                                            node.type.name === "image" &&
                                            node.attrs.image == id
                                        ) {
                                            const attrs = Object.assign(
                                                {},
                                                node.attrs
                                            ) as Record<string, any>
                                            attrs["image"] = newId
                                            const nodeType =
                                                this.mod.editor.currentView.state
                                                    .schema.nodes["image"]
                                            const transaction =
                                                this.mod.editor.view.state.tr.setNodeMarkup(
                                                    pos,
                                                    nodeType,
                                                    attrs
                                                )
                                            this.mod.editor.view.dispatch(
                                                transaction
                                            )
                                        }
                                    }
                                )
                                resolve({id: id, newId: newId})
                            },
                            (_error: any) => reject(id)
                        )
                    })
                    .catch((_error: any) => {
                        reject(id)
                    })
            }
        )
        return newPromise
    }

    hasUnsentEvents(): number {
        return this.unsent.length
    }

    unsentEvents(): {type: string; id?: number; image?: ImageEntry}[] {
        return this.unsent.map(event => {
            if (event.type === "delete") {
                return event
            } else if (event.type === "update") {
                // Check image entry still exists. Otherwise ignore.
                const image = (this.db as Record<number, ImageEntry>)[
                    event.id as number
                ]
                if (image) {
                    return {
                        type: "update",
                        id: event.id,
                        image
                    }
                } else {
                    return {
                        type: "ignore"
                    }
                }
            }
            return {type: "ignore"}
        })
    }

    eventsSent(n: {length: number}): void {
        this.unsent = this.unsent.slice(n.length)
    }

    receive(events: {type: string; id?: number; image?: ImageEntry}[]): void {
        events.forEach(event => {
            if (event.type == "delete") {
                this.deleteLocalImage(event.id as number)
            } else if (event.type == "update") {
                this.setLocalImage(
                    event.id as number,
                    event.image as ImageEntry
                )
            }
        })
    }

    findImage(imageData: ImageInput): number | undefined {
        const id = Object.keys(this.db as Record<number, ImageEntry>).find(
            id =>
                (this.db as Record<number, ImageEntry>)[Number.parseInt(id)]
                    .checksum === imageData.checksum
        )
        return id ? Number.parseInt(id) : undefined
    }

    hasImage(imageData: ImageInput): boolean {
        if (this.findImage(imageData) !== undefined) {
            return true
        } else {
            return false
        }
    }
}
