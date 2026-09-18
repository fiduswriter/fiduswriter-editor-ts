import { Dialog } from "fwtoolkit";
import { getExportTrackChangesValue, htmlExportDialogTemplate } from "./templates.js";
export class HtmlExportDialog {
    dialog;
    constructor() {
        this.dialog = false;
    }
    init() {
        const buttons = [];
        const dialogDonePromise = new Promise(resolve => {
            buttons.push({
                text: gettext("Export"),
                classes: "fw-dark",
                click: () => {
                    const dialogEl = this.dialog.dialogEl;
                    const svgMath = dialogEl.querySelector(".html-svg-math")?.checked;
                    const resolveTrackChanges = getExportTrackChangesValue(dialogEl, "html-track-changes") !== "include";
                    this.dialog.close();
                    return resolve({ svgMath: !!svgMath, resolveTrackChanges });
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
            title: gettext("HTML export options"),
            body: htmlExportDialogTemplate(),
            height: 330,
            width: 420,
            buttons,
            restoreActiveElement: false
        });
        this.dialog.open();
        return dialogDonePromise;
    }
}
//# sourceMappingURL=html_export.js.map