import {getNonDeletedTextContent} from "@fiduswriter/document/schema/text"
import {Dialog} from "fwtoolkit"

import {wordCounterDialogTemplate} from "./templates.js"
import type {Editor} from "../../types.js"

export class WordCountDialog {
    editor: Editor

    constructor(editor: Editor) {
        this.editor = editor
    }

    init(): void {
        const dialog = new Dialog({
            title: gettext("Word counter"),
            body: wordCounterDialogTemplate(this.countWords()),
            buttons: [{type: "close" as const}]
        })
        dialog.open()
    }

    countWords(): {
        docNumWords: number
        docNumNoSpace: number
        docNumChars: number
        selectionNumWords: number
        selectionNumNoSpace: number
        selectionNumChars: number
    } {
        const textContent = getNonDeletedTextContent(
                this.editor.view.state.doc
            ),
            footnoteContent = getNonDeletedTextContent(
                (this.editor.mod.footnotes as {fnEditor: {view: {state: {doc: import("prosemirror-model").Node}}}}).fnEditor.view.state.doc
            ),
            bibliographyContent =
                document.querySelector(".doc-bibliography")?.textContent || ""
        const docContent =
            textContent + " " + footnoteContent + " " + bibliographyContent
        const docNumChars = docContent.split("\n").join("").length - 2 // Subtract two for added spaces
        const docWords = docContent.split(/[\n ]+/)

        const docNumNoSpace = docWords.join("").length
        const docNumWords = docNumNoSpace ? docWords.length : 0

        const selectionContent = getNonDeletedTextContent(
            this.editor.currentView.state.doc.cut(
                this.editor.currentView.state.selection.from,
                this.editor.currentView.state.selection.to
            )
        )
        const selectionNumChars = selectionContent.split("\n").join("").length
        const selectionWords = selectionContent.split(/[\n ]+/)
        const selectionNumNoSpace = selectionWords.join("").length
        const selectionNumWords = selectionNumNoSpace
            ? selectionWords.length
            : 0

        return {
            docNumWords,
            docNumNoSpace,
            docNumChars,
            selectionNumWords,
            selectionNumNoSpace,
            selectionNumChars
        }
    }
}
