import { DOMSerializer, Schema } from "prosemirror-model";
import { nodes } from "prosemirror-schema-basic";
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
            getAttrs(dom) {
                return {
                    name: dom.dataset.name,
                    id: Number.parseInt(dom.dataset.id || "0")
                };
            }
        }
    ],
    toDOM(node) {
        return [
            "span",
            {
                class: "collaborator",
                "data-name": node.attrs.name,
                "data-id": node.attrs.id
            },
            node.attrs.name
        ];
    }
};
const doc = {
    content: "block+",
    toDOM() {
        return ["div", 0];
    }
};
export const commentSchema = new Schema({
    nodes: {
        doc,
        paragraph: nodes.paragraph,
        text: nodes.text,
        collaborator
    },
    marks: {}
});
export const serializeCommentNode = (pmNode) => {
    const serializer = DOMSerializer.fromSchema(commentSchema), dom = serializer.serializeNode(pmNode);
    return { html: dom.innerHTML, text: dom.innerText };
};
export const serializeComment = (content) => {
    const pmNode = commentSchema.nodeFromJSON({ type: "doc", content });
    return serializeCommentNode(pmNode);
};
//# sourceMappingURL=schema.js.map