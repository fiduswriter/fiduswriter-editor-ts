import {Dialog} from "fwtoolkit"
import {keyBindingsTemplate} from "./templates.js"
/* This is an adaptation of question.mark for Fidus Writer http://fiduswriter.org
 * originally by Gabriel Lopez <gabriel.marcos.lopez@gmail.com>
 */

import type {Editor} from "../../types.js"

export class KeyBindingsDialog {
    editor: Editor

    constructor(editor: Editor) {
        this.editor = editor
    }

    init(): void {
        const dialog = new Dialog({
            title: gettext("Keyboard Shortcuts"),
            body: keyBindingsTemplate(),
            width: 850,
            buttons: [{type: "close" as const}]
        })
        dialog.open()
    }
}
