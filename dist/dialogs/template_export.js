import { Dialog } from "fwtoolkit";
import { exportTrackChangesTemplate, getExportTrackChangesValue } from "./templates.js";
/** Ask how tracked changes should be handled before a DOCX/ODT template export. */
export class TemplateExportDialog {
    dialog;
    constructor() {
        this.dialog = false;
    }
    init(fileType) {
        const title = fileType === "docx"
            ? gettext("DOCX export options")
            : gettext("ODT export options");
        const buttons = [];
        const dialogDonePromise = new Promise(resolve => {
            buttons.push({
                text: gettext("Export"),
                classes: "fw-dark",
                click: () => {
                    const dialogEl = this.dialog.dialogEl;
                    const resolveTrackChanges = getExportTrackChangesValue(dialogEl, "template-track-changes") !== "include";
                    this.dialog.close();
                    return resolve({ resolveTrackChanges });
                }
            });
            buttons.push({
                type: "cancel",
                click: () => {
                    ;
                    this.dialog.close();
                    resolve(false);
                }
            });
        });
        this.dialog = new Dialog({
            title,
            body: exportTrackChangesTemplate("template-track-changes"),
            height: 220,
            width: 420,
            buttons,
            restoreActiveElement: false
        });
        this.dialog.open();
        return dialogDonePromise;
    }
}
//# sourceMappingURL=template_export.js.map