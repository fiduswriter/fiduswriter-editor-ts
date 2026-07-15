import {post} from "fwtoolkit"
import {serializeCommentNode} from "./schema.js"
import type {Node} from "prosemirror-model"

export const notifyMentionedUser = (
    docId: number,
    userId: number,
    comment: Node
) => {
    const {html, text} = serializeCommentNode(comment)
    return post("/api/document/comment_notify/", {
        doc_id: docId,
        collaborator_id: userId,
        comment_html: html,
        comment_text: text,
        type: "mention"
    })
}
