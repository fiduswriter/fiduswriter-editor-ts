import { Dialog } from "fwtoolkit";
import { keyBindingsTemplate } from "./templates.js";
export class KeyBindingsDialog {
    editor;
    constructor(editor) {
        this.editor = editor;
    }
    init() {
        const dialog = new Dialog({
            title: gettext("Keyboard Shortcuts"),
            body: keyBindingsTemplate(),
            width: 850,
            buttons: [{ type: "close" }]
        });
        dialog.open();
    }
}
//# sourceMappingURL=index.js.map