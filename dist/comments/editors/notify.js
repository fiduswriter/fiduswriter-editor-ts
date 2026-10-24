import { serializeCommentNode } from "./schema.js";
export const notifyMentionedUser = (documentApi, docId, userId, comment, e2ee = false) => {
    // comment content is never sent to the notification
    // endpoint for encrypted documents.
    const { html, text } = e2ee
        ? { html: "", text: "" }
        : serializeCommentNode(comment);
    return documentApi.commentNotify({
        doc_id: docId,
        collaborator_id: userId,
        comment_html: html,
        comment_text: text,
        type: "mention"
    });
};
//# sourceMappingURL=notify.js.map