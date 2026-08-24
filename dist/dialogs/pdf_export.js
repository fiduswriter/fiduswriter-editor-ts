import { Dialog } from "fwtoolkit";
import { pdfExportDialogTemplate } from "./templates.js";
export class PdfExportDialog {
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
                    const trackChangesValue = dialogEl.querySelector('input[name="pdf-track-changes"]:checked')?.value;
                    const checked = (selector) => dialogEl.querySelector(selector).checked;
                    const result = {
                        resolveTrackChanges: trackChangesValue !== "include",
                        embedFidusFile: checked(".pdf-embed-fidus"),
                        figurePageFloats: checked(".pdf-figure-page-floats"),
                        tablePageFloats: checked(".pdf-table-page-floats"),
                        printOptions: {
                            cropMarks: checked(".pdf-crop-marks"),
                            trimBox: checked(".pdf-trim-box"),
                            bleedBox: checked(".pdf-bleed-box"),
                            bleedMm: parseFloat(dialogEl.querySelector(".pdf-bleed-mm").value) || 0,
                            linkAnnotationBorders: checked(".pdf-link-borders"),
                            rasterizeSvgs: checked(".pdf-rasterize-svgs")
                        }
                    };
                    this.dialog.close();
                    return resolve(result);
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
            title: gettext("PDF export options"),
            body: pdfExportDialogTemplate(),
            height: 470,
            width: 420,
            buttons,
            restoreActiveElement: false
        });
        this.dialog.open();
        return dialogDonePromise;
    }
}
//# sourceMappingURL=pdf_export.js.map