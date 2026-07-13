import {ModFootnoteEditor} from "./editor.js"
import {ModFootnoteLayout} from "./layout.js"

export class ModFootnotes {
    constructor(editor) {
        editor.mod.footnotes = this
        this.editor = editor
        new ModFootnoteEditor(this)
        new ModFootnoteLayout(this)
    }

    init() {
        this.fnEditor.init()
        this.layout.init()
    }
}
