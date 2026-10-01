import {Dialog} from "fwtoolkit"
import {
    getExportTrackChangesValue,
    htmlExportDialogTemplate
} from "./templates.js"

export interface HtmlExportDialogResult {
    /** Render `equation`/`figure_equation` nodes as SVG images (MathJax)
        instead of MathML. */
    svgMath: boolean
    /** Resolve all tracked changes (accept all) before exporting. When false,
        the tracked changes are kept and rendered in the export. */
    resolveTrackChanges: boolean
}

export class HtmlExportDialog {
    dialog: Dialog | false

    constructor() {
        this.dialog = false
    }

    init(): Promise<HtmlExportDialogResult | false> {
        const buttons: Array<Record<string, unknown>> = []
        const dialogDonePromise = new Promise<HtmlExportDialogResult | false>(
            resolve => {
                buttons.push({
                    text: gettext("Export"),
                    classes: "fw-dark",
                    click: () => {
                        const dialogEl = (this.dialog as Dialog).dialogEl
                        const svgMath = (
                            dialogEl.querySelector(
                                ".html-svg-math"
                            ) as HTMLInputElement
                        )?.checked
                        const resolveTrackChanges =
                            getExportTrackChangesValue(
                                dialogEl,
                                "html-track-changes"
                            ) !== "include"
                        ;(this.dialog as Dialog).close()
                        return resolve({
                            svgMath: !!svgMath,
                            resolveTrackChanges
                        })
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
            title: gettext("HTML export options"),
            body: htmlExportDialogTemplate(),
            height: 330,
            width: 420,
            buttons,
            restoreActiveElement: false
        })
        this.dialog.open()

        return dialogDonePromise
    }
}
