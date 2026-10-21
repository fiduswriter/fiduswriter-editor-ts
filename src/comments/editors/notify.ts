import {serializeCommentNode} from "./schema.js"
import type {Node} from "prosemirror-model"
import type {EditorDocumentApi} from "../../types.js"

export const notifyMentionedUser = (
    documentApi: EditorDocumentApi,
    docId: number,
    userId: number,
    comment: Node,
    e2ee = false
) => {
    // comment content is never sent to the notification
    // endpoint for encrypted documents.
    const {html, text} = e2ee
        ? {html: "", text: ""}
        : serializeCommentNode(comment)
    return documentApi.commentNotify({
        doc_id: docId,
        collaborator_id: userId,
        comment_html: html,
        comment_text: text,
        type: "mention"
    })
}
