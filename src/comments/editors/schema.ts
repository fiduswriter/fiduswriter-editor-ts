import {DOMSerializer, Schema} from "prosemirror-model"
import {nodes} from "prosemirror-schema-basic"
import type {Node} from "prosemirror-model"

const collaborator = {
    inline: true,
    group: "inline",
    attrs: {
        name: {
            default: ""
        },
        id: {
            default: 0
        }
    },
    parseDOM: [
        {
            tag: "span.collaborator",
            getAttrs(dom: HTMLElement) {
                return {
                    name: dom.dataset.name,
                    id: Number.parseInt(dom.dataset.id || "0")
                }
            }
        }
    ],
    toDOM(node: Node): [string, Record<string, unknown>, string] {
        return [
            "span",
            {
                class: "collaborator",
                "data-name": node.attrs.name,
                "data-id": node.attrs.id
            },
            node.attrs.name
        ]
    }
}

const doc = {
    content: "block+",
    toDOM(): [string, number] {
        return ["div", 0]
    }
}

export const commentSchema = new Schema({
    nodes: {
        doc,
        paragraph: nodes.paragraph,
        text: nodes.text,
        collaborator
    },
    marks: {}
})

export const serializeCommentNode = (pmNode: Node): {html: string; text: string} => {
    const serializer = DOMSerializer.fromSchema(commentSchema),
        dom = serializer.serializeNode(pmNode) as HTMLElement
    return {html: dom.innerHTML, text: dom.innerText}
}

export const serializeComment = (content: unknown): {html: string; text: string} => {
    const pmNode = commentSchema.nodeFromJSON({type: "doc", content})
    return serializeCommentNode(pmNode)
}
