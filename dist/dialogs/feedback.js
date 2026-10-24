import { Dialog, addAlert } from "fwtoolkit";
/**
 * The user-feedback form, reached through Help → Technical support.
 *
 * Only offered when the host supplies a feedback connector (`app.apiConnectors
 * .feedback`) — the Fidus Writer server's `feedback` app does; standalone
 * hosts do not, and the menu entry is hidden for them.
 */
export function openFeedbackDialog(editor) {
    const feedback = editor.app.apiConnectors?.feedback;
    if (!feedback) {
        return;
    }
    const dialog = new Dialog({
        id: "fw-feedback",
        title: gettext("Technical support"),
        body: `
            <div class="fw-feedback-dialog">
                <p>
                    ${gettext("Describe the problem you are experiencing, and, if possible, how to reproduce it. The message is sent to the operators of this Fidus Writer installation together with technical information about your setup.")}
                </p>
                <textarea
                    id="fw-feedback-message"
                    class="fw-form-text"
                    rows="6"
                    style="width:100%"
                ></textarea>
            </div>
        `,
        buttons: [
            {
                text: gettext("Cancel"),
                classes: "fw-orange",
                click: () => dialog.close()
            },
            {
                text: gettext("Send"),
                classes: "fw-dark",
                click: () => {
                    const message = dialog.dialogEl.querySelector("#fw-feedback-message")?.value;
                    if (!message?.trim()) {
                        addAlert("error", gettext("Please enter a message first."));
                        return;
                    }
                    dialog.close();
                    feedback
                        .send({ message })
                        .then(() => addAlert("info", gettext("Thank you for your feedback!")))
                        .catch(() => addAlert("error", gettext("Your feedback could not be delivered. Please try again later.")));
                }
            }
        ]
    });
    dialog.open();
}
//# sourceMappingURL=feedback.js.map