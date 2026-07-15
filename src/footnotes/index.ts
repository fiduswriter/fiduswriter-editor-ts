import {ModFootnoteEditor} from "./editor.js"
import {ModFootnoteLayout} from "./layout.js"
import type {Editor} from "../types.js"

export class ModFootnotes {
    editor: Editor
    fnEditor: ModFootnoteEditor
    layout: ModFootnoteLayout

    constructor(editor: Editor) {
        editor.mod.footnotes = this
        this.editor = editor
        this.fnEditor = new ModFootnoteEditor(this)
        this.layout = new ModFootnoteLayout(this)
    }

    init(): void {
        this.fnEditor.init()
        this.layout.init()
    }
}
