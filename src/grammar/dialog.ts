import {Dialog, escapeText, findTarget} from "fwtoolkit"
import type {EditorView} from "prosemirror-view"

import type {Editor} from "../types.js"
import type {GrammarMatchPM} from "./matches.js"
import {removeDecorationsBetween} from "../state_plugins/grammar_check.js"
import {dialogTemplate} from "./templates.js"

export class DialogGrammar {
    editor: Editor
    view: EditorView
    match: GrammarMatchPM
    dialog!: Dialog

    constructor(editor: Editor, view: EditorView, match: GrammarMatchPM) {
        this.editor = editor
        this.view = view
        this.match = match
    }

    init(): void {
        const suggestions = this.match.suggestions || []
        this.dialog = new Dialog({
            width: 350,
            height: Math.min(49 * suggestions.length + 60, 460),
            title: escapeText(
                this.match.short_message || this.match.message || ""
            ),
            body: dialogTemplate({
                message: this.match.message,
                suggestions
            }),
            buttons: [{type: "close" as const}]
        })
        this.dialog.open()
        this.bind()
    }

    bind(): void {
        this.dialog.dialogEl.addEventListener("click", event => {
            const el = {}
            switch (true) {
                case findTarget(event, ".replacement", el): {
                    const id = parseInt(
                        (el as {target: HTMLElement}).target.dataset.id || "0"
                    )
                    this.applyReplacement(id)
                    break
                }
                default:
                    break
            }
        })
    }

    applyReplacement(id: number): void {
        const suggestion = this.match.suggestions?.[id]
        if (
            suggestion &&
            this.view.state.selection.from !== this.view.state.selection.to
        ) {
            const removeDecosTr = removeDecorationsBetween(
                this.view.state,
                this.view.state.selection.from,
                this.view.state.selection.to
            )
            if (removeDecosTr) {
                this.view.dispatch(removeDecosTr)
            }

            const transaction = this.view.state.tr.replaceSelectionWith(
                this.view.state.schema.text(suggestion.value),
                true
            )
            this.view.dispatch(transaction)
        }
        this.dialog.close()
        this.view.focus()
    }
}
