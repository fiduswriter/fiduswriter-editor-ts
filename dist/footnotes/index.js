import { ModFootnoteEditor } from "./editor.js";
import { ModFootnoteLayout } from "./layout.js";
export class ModFootnotes {
    editor;
    fnEditor;
    layout;
    constructor(editor) {
        editor.mod.footnotes = this;
        this.editor = editor;
        this.fnEditor = new ModFootnoteEditor(this);
        this.layout = new ModFootnoteLayout(this);
    }
    init() {
        this.fnEditor.init();
        this.layout.init();
    }
}
//# sourceMappingURL=index.js.map