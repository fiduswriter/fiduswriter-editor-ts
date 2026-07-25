import {NodeSelection} from "prosemirror-state"
import {Dialog} from "fwtoolkit"
import type {Node} from "prosemirror-model"

import {sub, subChars, sup, supChars} from "./subsup.js"
import {mathDialogTemplate} from "./templates.js"
import type {Editor} from "../types.js"

/**
 * Class to work with formula dialog
 */
export class MathDialog {
    editor: Editor
    node: Node | null
    equationSelected: boolean
    equation: string
    dialog: InstanceType<typeof Dialog> | undefined
    mathliveDOM: HTMLElement | null
    mathField: unknown

    constructor(editor: Editor) {
        this.editor = editor
        this.node =
            this.editor.currentView.state.selection instanceof NodeSelection
                ? this.editor.currentView.state.selection.node
                : null
        this.equationSelected =
            this.node?.attrs && this.node.attrs.equation ? true : false
        this.equation = this.equationSelected
            ? (this.node?.attrs.equation as string)
            : ""
        this.mathliveDOM = null
        this.mathField = false
    }

    init(): void {
        //get selected node

        //initialize dialog and open it
        this.dialog = new Dialog({
            body: mathDialogTemplate(),
            height: 150,
            buttons: [
                {
                    text: this.equationSelected
                        ? gettext("Update")
                        : gettext("Insert"),
                    classes: "fw-dark insert-math",
                    click: () => {
                        const view = this.editor.currentView,
                            state = view.state

                        this.equation = this.getLatex()

                        if (new RegExp(/^\s*$/).test(this.equation)) {
                            // The math input is empty. Delete a math node if it exist. Then close the dialog.
                            if (this.equationSelected) {
                                view.dispatch(state.tr.deleteSelection())
                            }
                            ;(this.dialog as InstanceType<typeof Dialog>).close()
                            return
                        } else if (
                            new RegExp(
                                `^\\^({[${supChars}]*}|[${supChars}]?)$`
                            ).test(this.equation)
                        ) {
                            // The math input is pure superscript and
                            // can be converted to ordinary characters.
                            view.dispatch(
                                state.tr.insertText(sup(this.equation.slice(1)))
                            )
                            ;(this.dialog as InstanceType<typeof Dialog>).close()
                            return
                        } else if (
                            new RegExp(
                                `^\\_({[${subChars}]*}|[${subChars}]?)$`
                            ).test(this.equation)
                        ) {
                            // The math input is pure subscript and
                            // can be converted to ordinary characters.
                            view.dispatch(
                                state.tr.insertText(sub(this.equation.slice(1)))
                            )
                            ;(this.dialog as InstanceType<typeof Dialog>).close()
                            return
                        } else if (
                            this.equationSelected &&
                            this.equation === this.node?.attrs.equation
                        ) {
                            // Equation selected, but has not changed from last time.
                            ;(this.dialog as InstanceType<typeof Dialog>).close()
                            return
                        }
                        const nodeType = state.schema.nodes["equation"]
                        view.dispatch(
                            state.tr.replaceSelectionWith(
                                nodeType.createAndFill({
                                    equation: this.equation
                                }) as Node
                            )
                        )
                        ;(this.dialog as InstanceType<typeof Dialog>).close()
                    }
                },
                {
                    type: "cancel" as const
                }
            ],
            title: gettext("Mathematical formula"),
            beforeClose: () => {
                if (this.mathField) {
                    this.mathField = false
                }
                if (window.mathVirtualKeyboard) {
                    window.mathVirtualKeyboard.hide()
                }
            },
            classes: "math",
            onClose: () => this.editor.currentView.focus(),
            restoreActiveElement: false
        })
        this.dialog.open()

        this.mathliveDOM = this.dialog.dialogEl.querySelector(".math-field")

        import("@fiduswriter/document/mathlive").then(MathLive => {
            interface MathfieldElementClass {
                strings: Record<string, Record<string, string>>,
                locale: string
                plonkSound: null
                keypressSound: null
                prototype: {getValue: () => string}
            }
            const MathfieldElement = (
                MathLive as unknown as {MathfieldElement: MathfieldElementClass}
            ).MathfieldElement
            MathfieldElement.strings = {
                int: {
                    "keyboard.tooltip.functions": gettext("Functions"),
                    "keyboard.tooltip.greek": gettext("Greek Letters"),
                    "keyboard.tooltip.command": gettext("LaTeX Command Mode"),
                    "keyboard.tooltip.numeric": gettext("Numeric"),
                    "keyboard.tooltip.roman": gettext(
                        "Symbols and Roman Letters"
                    ),
                    "tooltip.copy to clipboard": gettext("Copy to Clipboard"),
                    "tooltip.redo": gettext("Redo"),
                    "tooltip.toggle virtual keyboard": gettext(
                        "Toggle Virtual Keyboard"
                    ),
                    "tooltip.undo": gettext("Undo")
                }
            }
            MathfieldElement.locale = "int"
            MathfieldElement.plonkSound = null
            MathfieldElement.keypressSound = null
            this.mathField = new (MathfieldElement as unknown as new (
                options: Record<string, unknown>
            ) => {getValue: () => string})({
                mathVirtualKeyboardPolicy: "auto"
            })
            ;(this.mathField as {value: string}).value = this.equation
            ;(this.mathliveDOM as HTMLElement).appendChild(
                this.mathField as unknown as globalThis.Node
            )
            ;(this.mathField as {select: () => void}).select()
        })
    }

    /**
     * Get latex representation as text
     */
    getLatex(): string {
        return (this.mathField as {getValue: () => string}).getValue()
    }
}
