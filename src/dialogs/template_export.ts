import {Dialog} from "fwtoolkit"
import {
    exportTrackChangesTemplate,
    getExportTrackChangesValue
} from "./templates.js"

export interface TemplateExportDialogResult {
    /** Resolve all tracked changes (accept all) before exporting. When false,
        the tracked changes are kept and rendered in the exported file. */
    resolveTrackChanges: boolean
}

/** Ask how tracked changes should be handled before a DOCX/ODT template export. */
export class TemplateExportDialog {
    dialog: Dialog | false

    constructor() {
        this.dialog = false
    }

    init(fileType: "docx" | "odt"): Promise<TemplateExportDialogResult | false> {
        const title =
            fileType === "docx"
                ? gettext("DOCX export options")
                : gettext("ODT export options")
        const buttons: Array<Record<string, unknown>> = []
        const dialogDonePromise = new Promise<TemplateExportDialogResult | false>(
            resolve => {
                buttons.push({
                    text: gettext("Export"),
                    classes: "fw-dark",
                    click: () => {
                        const dialogEl = (this.dialog as Dialog).dialogEl
                        const resolveTrackChanges =
                            getExportTrackChangesValue(
                                dialogEl,
                                "template-track-changes"
                            ) !== "include"
                        ;(this.dialog as Dialog).close()
                        return resolve({resolveTrackChanges})
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
            title,
            body: exportTrackChangesTemplate("template-track-changes"),
            height: 220,
            width: 420,
            buttons,
            restoreActiveElement: false
        })
        this.dialog.open()

        return dialogDonePromise
    }
}
