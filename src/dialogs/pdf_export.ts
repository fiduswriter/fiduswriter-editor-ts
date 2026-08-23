import {Dialog} from "fwtoolkit"
import {pdfExportDialogTemplate} from "./templates.js"

export interface PdfExportPrintOptions {
    cropMarks: boolean
    trimBox: boolean
    bleedBox: boolean
    bleedMm: number
    linkAnnotationBorders: boolean
    rasterizeSvgs: boolean
}

export interface PdfExportDialogResult {
    /** Resolve all tracked changes (accept all) before exporting. When false,
        the tracked changes are kept and rendered in the PDF. */
    resolveTrackChanges: boolean
    /** Embed a .fidus file of the document as a PDF attachment. */
    embedFidusFile: boolean
    /** Place figures as page floats (moved to the top of the page). */
    figurePageFloats: boolean
    /** Place tables as page floats (moved to the top of the page). */
    tablePageFloats: boolean
    /** Print-production options passed to the vivliostyle-pdf emitter. */
    printOptions: PdfExportPrintOptions
}

export class PdfExportDialog {
    dialog: Dialog | false

    constructor() {
        this.dialog = false
    }

    init(): Promise<PdfExportDialogResult | false> {
        const buttons: Array<Record<string, unknown>> = []
        const dialogDonePromise = new Promise<PdfExportDialogResult | false>(
            resolve => {
                buttons.push({
                    text: gettext("Export"),
                    classes: "fw-dark",
                    click: () => {
                        const dialogEl = (this.dialog as Dialog).dialogEl
                        const trackChangesValue = (
                            dialogEl.querySelector(
                                'input[name="pdf-track-changes"]:checked'
                            ) as HTMLInputElement
                        )?.value
                        const checked = (selector: string): boolean =>
                            (
                                dialogEl.querySelector(selector) as HTMLInputElement
                            ).checked
                        const result: PdfExportDialogResult = {
                            resolveTrackChanges:
                                trackChangesValue !== "include",
                            embedFidusFile: checked(".pdf-embed-fidus"),
                            figurePageFloats: checked(
                                ".pdf-figure-page-floats"
                            ),
                            tablePageFloats: checked(".pdf-table-page-floats"),
                            printOptions: {
                                cropMarks: checked(".pdf-crop-marks"),
                                trimBox: checked(".pdf-trim-box"),
                                bleedBox: checked(".pdf-bleed-box"),
                                bleedMm:
                                    parseFloat(
                                        (
                                            dialogEl.querySelector(
                                                ".pdf-bleed-mm"
                                            ) as HTMLInputElement
                                        ).value
                                    ) || 0,
                                linkAnnotationBorders: checked(
                                    ".pdf-link-borders"
                                ),
                                rasterizeSvgs: checked(".pdf-rasterize-svgs")
                            }
                        }
                        ;(this.dialog as Dialog).close()
                        return resolve(result)
                    }
                })

                buttons.push({
                    type: "cancel" as const,
                    click: () => {
                        ;(this.dialog as Dialog).close()
                        resolve(false)
                    }
                })
            }
        )

        this.dialog = new Dialog({
            title: gettext("PDF export options"),
            body: pdfExportDialogTemplate(),
            height: 470,
            width: 420,
            buttons,
            restoreActiveElement: false
        })
        this.dialog.open()

        return dialogDonePromise
    }
}
