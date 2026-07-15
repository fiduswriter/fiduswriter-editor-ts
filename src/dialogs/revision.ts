import {Dialog} from "fwtoolkit"
import {revisionDialogTemplate} from "./templates.js"

export class RevisionDialog {
    dir: string
    dialog: Dialog | false

    constructor(dir: string) {
        this.dir = dir
        this.dialog = false
    }

    init(): Promise<string> {
        const buttons: Array<Record<string, unknown>> = []
        const dialogDonePromise = new Promise<string>(resolve => {
            buttons.push({
                text: gettext("Save"),
                classes: "fw-dark",
                click: () => {
                    const note = (
                        (this.dialog as Dialog).dialogEl.querySelector(
                            ".revision-note"
                        ) as HTMLInputElement
                    ).value
                    ;(this.dialog as Dialog).close()
                    return resolve(note)
                }
            })

            buttons.push({
                type: "cancel" as const
            })
        })

        this.dialog = new Dialog({
            title: gettext("Revision description"),
            body: revisionDialogTemplate({dir: this.dir}),
            height: 100,
            width: 300,
            buttons,
            restoreActiveElement: false
        })
        this.dialog.open()

        return dialogDonePromise
    }
}
