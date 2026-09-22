import { Dialog } from "fwtoolkit";
import { epubExportDialogTemplate, getExportTrackChangesValue } from "./templates.js";
export class EpubExportDialog {
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
                    const svgMath = dialogEl.querySelector(".epub-svg-math")?.checked;
                    const resolveTrackChanges = getExportTrackChangesValue(dialogEl, "epub-track-changes") !== "include";
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
            title: gettext("EPUB export options"),
            body: epubExportDialogTemplate(),
            height: 330,
            width: 420,
            buttons,
            restoreActiveElement: false
        });
        this.dialog.open();
        return dialogDonePromise;
    }
}
//# sourceMappingURL=epub_export.js.map