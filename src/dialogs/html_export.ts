import {Dialog} from "fwtoolkit"
import {htmlExportDialogTemplate} from "./templates.js"

export interface HtmlExportDialogResult {
    /** Render `equation`/`figure_equation` nodes as SVG images (MathJax)
        instead of MathML. */
    svgMath: boolean
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
                        ;(this.dialog as Dialog).close()
                        return resolve({svgMath: !!svgMath})
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
            height: 220,
            width: 420,
            buttons,
            restoreActiveElement: false
        })
        this.dialog.open()

        return dialogDonePromise
    }
}
