import { getPasteRange, resetPasteRange } from "../../state_plugins/clipboard.js";
export class TextPaste {
    editor;
    text;
    view;
    foundBibEntries;
    constructor(editor, text, view) {
        this.editor = editor;
        this.text = text;
        this.view = view;
        this.foundBibEntries = false;
    }
    init() {
        import("@fiduswriter/bibliography-manager/import").then(({ BibliographyImporter }) => {
            const bibDB = this.editor.mod.db?.bibDB;
            const importer = new BibliographyImporter(this.text, bibDB, (newIds) => {
                this.foundBibEntries = true;
                const format = "autocite", references = newIds.map(id => ({ id }));
                const citationNode = this.view.state.schema.nodes["citation"].create({ format, references });
                const pasteRange = getPasteRange(this.view.state);
                if (pasteRange) {
                    const tr = this.view.state.tr;
                    tr.replaceRangeWith(pasteRange[0], pasteRange[1], citationNode);
                    resetPasteRange(tr);
                    tr.setMeta("addToHistory", false);
                    this.view.dispatch(tr);
                }
            }, () => {
                if (!this.foundBibEntries) {
                    // There were no citations in the pasted text.
                    const pasteRange = getPasteRange(this.view.state);
                    if (pasteRange) {
                        const tr = this.view.state.tr;
                        resetPasteRange(tr);
                        this.view.dispatch(tr);
                    }
                }
            }, false // no messages to end user. Would be confusing if user just wants to paste unrelated text.
            );
            importer.init();
        });
    }
}
//# sourceMappingURL=text.js.map