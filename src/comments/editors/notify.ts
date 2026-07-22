import {serializeCommentNode} from "./schema.js"
import type {Node} from "prosemirror-model"
import type {EditorDocumentApi} from "../../types.js"

export const notifyMentionedUser = (
    documentApi: EditorDocumentApi,
    docId: number,
    userId: number,
    comment: Node
) => {
    const {html, text} = serializeCommentNode(comment)
    return documentApi.commentNotify({
        doc_id: docId,
        collaborator_id: userId,
        comment_html: html,
        comment_text: text,
        type: "mention"
    })
}
