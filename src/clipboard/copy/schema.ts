// A slight modification of the document schema for the purpose of copying.
import {DOMSerializer, Node, Schema} from "prosemirror-model"

import {citation} from "@fiduswriter/document/schema/common/index"
import {footnote} from "@fiduswriter/document/schema/document/content"
import {fnSchema} from "@fiduswriter/document/schema/footnotes"
import type {BibDB} from "@fiduswriter/document"

interface CachedSchema {
    cached: {bibDB: BibDB}
}

const asCached = (schema: Schema): CachedSchema => schema as unknown as CachedSchema

const copyCitation = Object.assign({}, citation)

copyCitation.toDOM = node => {
    const bibDB = asCached(node.type.schema).cached.bibDB,
        bibs: Record<string, Record<string, unknown>> = {}
    ;(node.attrs.references as Array<{id: number | string}>).forEach(
        ref => (bibs[ref.id] = bibDB.db[ref.id])
    )
    return [
        "span",
        {
            class: "citation",
            "data-format": node.attrs.format,
            "data-references": JSON.stringify(node.attrs.references),
            "data-bibs": JSON.stringify(bibs)
        }
    ]
}

/*
Citations inside of footnotes copied from the main editor also need to have bibliography
information attached to them.
*/

export const fnCopySchema = new Schema({
    marks: fnSchema.spec.marks,
    nodes: fnSchema.spec.nodes.update("citation", copyCitation)
})

const copyFootnote = Object.assign({}, footnote)

copyFootnote.toDOM = node => {
    if (!asCached(fnCopySchema).cached.bibDB) {
        asCached(fnCopySchema).cached.bibDB = asCached(fnSchema).cached.bibDB
    }
    const fnCopySerializer = DOMSerializer.fromSchema(fnCopySchema)
    const dom = document.createElement("span")
    dom.classList.add("footnote-marker")
    const pmNode = Node.fromJSON(fnCopySchema, {
        type: "footnotecontainer",
        content: node.attrs.footnote
    })
    dom.dataset.footnote = (
        fnCopySerializer.serializeNode(pmNode) as HTMLElement
    ).innerHTML
    dom.innerHTML = "&nbsp;"
    return dom
}

export const createDocCopySchema = (docSchema: Schema): Schema => {
    const newSchema = new Schema({
        marks: docSchema.spec.marks,
        nodes: docSchema.spec.nodes
            .update("citation", copyCitation)
            .update("footnote", copyFootnote)
    })
    asCached(newSchema).cached.bibDB = asCached(docSchema).cached.bibDB
    return newSchema
}
