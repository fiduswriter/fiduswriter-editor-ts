import { serializeCommentNode } from "./schema.js";
export const notifyMentionedUser = (documentApi, docId, userId, comment) => {
    const { html, text } = serializeCommentNode(comment);
    return documentApi.commentNotify({
        doc_id: docId,
        collaborator_id: userId,
        comment_html: html,
        comment_text: text,
        type: "mention"
    });
};
//# sourceMappingURL=notify.js.map