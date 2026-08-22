import {Dialog} from "fwtoolkit"
import {epubExportDialogTemplate, getExportTrackChangesValue} from "./templates.js"

export interface EpubExportDialogResult {
    /** Render `equation`/`figure_equation` nodes as SVG images (MathJax)
        instead of MathML. */
    svgMath: boolean
    /** Resolve all tracked changes (accept all) before exporting. When false,
        the tracked changes are kept and rendered in the export. */
    resolveTrackChanges: boolean
}

export class EpubExportDialog {
    dialog: Dialog | false

    constructor() {
        this.dialog = false
    }

    init(): Promise<EpubExportDialogResult | false> {
        const buttons: Array<Record<string, unknown>> = []
        const dialogDonePromise = new Promise<EpubExportDialogResult | false>(
            resolve => {
                buttons.push({
                    text: gettext("Export"),
                    classes: "fw-dark",
                    click: () => {
                        const dialogEl = (this.dialog as Dialog).dialogEl
                        const svgMath = (
                            dialogEl.querySelector(
                                ".epub-svg-math"
                            ) as HTMLInputElement
                        )?.checked
                        const resolveTrackChanges =
                            getExportTrackChangesValue(
                                dialogEl,
                                "epub-track-changes"
                            ) !== "include"
                        ;(this.dialog as Dialog).close()
                        return resolve({svgMath: !!svgMath, resolveTrackChanges})
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
            title: gettext("EPUB export options"),
            body: epubExportDialogTemplate(),
            height: 330,
            width: 420,
            buttons,
            restoreActiveElement: false
        })
        this.dialog.open()

        return dialogDonePromise
    }
}
