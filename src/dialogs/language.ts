import {Dialog} from "fwtoolkit"
import {LANGUAGES} from "@fiduswriter/document/schema/const"

import {languageTemplate} from "./templates.js"
import type {Editor} from "../types.js"

export class LanguageDialog {
    editor: Editor
    language: string
    dialog: InstanceType<typeof Dialog> | false

    constructor(editor: Editor, language: string) {
        this.editor = editor
        this.language = language
        this.dialog = false
    }

    init(): void {
        const buttons = []
        buttons.push({
            text: gettext("Change"),
            classes: "fw-dark",
            click: () => {
                const language =
                    (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector("select")?.value || this.language
                ;(this.dialog as InstanceType<typeof Dialog>).close()

                if (language === this.language) {
                    // No change.
                    return
                }
                this.editor.view.dispatch(
                    this.editor.view.state.tr
                        .setDocAttribute("language", language)
                        .setMeta("settings", true)
                )
                return
            }
        })

        buttons.push({
            type: "cancel" as const
        })

        this.dialog = new Dialog({
            width: 300,
            height: 180,
            id: "select-document-language",
            title: gettext("Change language of the document"),
            body: languageTemplate({
                currentLanguage: this.language,
                allowedLanguages: LANGUAGES.filter(lang =>
                    this.editor.view.state.doc.attrs.languages.includes(lang[0])
                )
            }),
            buttons,
            onClose: () => this.editor.currentView.focus(),
            restoreActiveElement: false
        })

        this.dialog.open()
    }
}
