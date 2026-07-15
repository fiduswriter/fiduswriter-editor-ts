import {Dialog} from "fwtoolkit"
import type {Node} from "prosemirror-model"

import {orderedListStartTemplate} from "./templates.js"
import type {Editor} from "../types.js"

export class OrderedListStartDialog {
    editor: Editor
    dialog: InstanceType<typeof Dialog> | false
    dialogEl: HTMLElement | false
    order: number

    constructor(editor: Editor) {
        this.editor = editor
        this.dialogEl = false
        this.order = 1
        this.dialog = false
    }

    init(): void {
        const {orderedList} = this.findOrderedList(
            this.editor.currentView.state
        )
        if (orderedList) {
            this.order = orderedList.attrs.order
        }
        this.insertDialog()
    }

    findOrderedList(state: {
        selection: {$head: import("prosemirror-model").ResolvedPos}
    }): {orderedList: Node | false; orderedListPos: number | false} {
        const $head = state.selection.$head
        for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type.name == "ordered_list") {
                return {
                    orderedList: $head.node(d),
                    orderedListPos: $head.before(d)
                }
            }
        }
        return {orderedList: false, orderedListPos: false}
    }

    submitForm(): void {
        const {orderedList, orderedListPos} = this.findOrderedList(
            this.editor.currentView.state
        )
        if (!orderedList || orderedListPos === false) {
            return
        }
        const attrs = Object.assign({}, orderedList.attrs, {
            order: this.order
        })
        this.editor.currentView.dispatch(
            this.editor.currentView.state.tr.setNodeMarkup(
                orderedListPos,
                undefined,
                attrs
            )
        )
    }

    insertDialog(): void {
        const buttons = []
        buttons.push({
            text: gettext("Update"),
            classes: "fw-dark",
            click: () => {
                this.submitForm()
                ;(this.dialog as InstanceType<typeof Dialog>).close()
            }
        })
        buttons.push({
            type: "cancel" as const
        })

        this.dialog = new Dialog({
            title: gettext("Set list start number"),
            body: orderedListStartTemplate({order: this.order}),
            width: 300,
            height: 100,
            buttons,
            onClose: () => this.editor.currentView.focus(),
            restoreActiveElement: false
        })

        this.dialog.open()

        const listStartInput = document.querySelector("input.list-start")
        if (listStartInput) {
            listStartInput.addEventListener("change", _event => {
                this.order = Number.parseInt((listStartInput as HTMLInputElement).value) || 1
            })
        }
    }
}
