import {Dialog, escapeText, findTarget} from "fwtoolkit"
import type {EditorView} from "prosemirror-view"

import type {Editor} from "../types.js"
import type {GrammarMatchPM} from "./matches.js"
import {isMisspelling} from "./matches.js"
import {removeDecorationsBetween} from "../state_plugins/grammar_check.js"
import {dialogTemplate} from "./templates.js"

export class DialogGrammar {
    editor: Editor
    view: EditorView
    match: GrammarMatchPM
    /** Covered text of the match; set for misspellings (ignore action). */
    word: string
    dialog!: Dialog

    constructor(editor: Editor, view: EditorView, match: GrammarMatchPM) {
        this.editor = editor
        this.view = view
        this.match = match
        this.word = ""
    }

    init(): void {
        const suggestions = this.match.suggestions || []
        const misspelling = isMisspelling(this.match)
        if (misspelling) {
            this.word = this.view.state.doc.textBetween(
                this.match.from,
                this.match.to
            )
        }
        this.dialog = new Dialog({
            width: 350,
            // One extra row for the ignore action (either words or rule).
            height: Math.min(49 * (suggestions.length + 1) + 60, 460),
            title: escapeText(
                this.match.short_message || this.match.message || ""
            ),
            body: dialogTemplate({
                message: this.match.message,
                suggestions,
                word: this.word,
                misspelling
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
                case findTarget(event, ".add-ignored", el): {
                    this.addIgnoredWord()
                    break
                }
                case findTarget(event, ".add-ignored-rule", el): {
                    this.editor.mod.grammar?.addIgnoredRule(this.match.rule_id)
                    this.dialog.close()
                    this.view.focus()
                    break
                }
                default:
                    break
            }
        })
    }

    /** Accept the covered text as correct (see ModGrammar.setIgnoredWords). */
    addIgnoredWord(): void {
        if (this.word) {
            this.editor.mod.grammar?.addIgnoredWord(this.word)
        }
        this.dialog.close()
        this.view.focus()
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
