import {CodeBlockDialog} from "../../dialogs/index.js"
import {NodeSelection} from "prosemirror-state"
import type {Editor} from "../../types.js"

interface MenuModelItem {
    title: string
    type: string
    tooltip: string
    order: number
    action: (editor: Editor) => boolean
    disabled?: (editor: Editor) => boolean
}

export const codeBlockMenuModel = () => ({
    content: [
        {
            title: `${gettext("Configure")} ...`,
            type: "action",
            tooltip: gettext("Configure the code block."),
            order: 1,
            action: (editor: Editor) => {
                const dialog = new CodeBlockDialog(editor)
                dialog.init()
                return false
            },
            disabled: (editor: Editor) => {
                const view = editor.currentView
                const {selection} = view.state

                // Check if we're in a code block
                let inCodeBlock = false
                if (
                    selection instanceof NodeSelection &&
                    selection.node.type.name === "code_block"
                ) {
                    inCodeBlock = true
                } else {
                    const $head = selection.$head
                    for (let d = $head.depth; d > 0; d--) {
                        if ($head.node(d).type.name === "code_block") {
                            inCodeBlock = true
                            break
                        }
                    }
                }

                return !inCodeBlock
            }
        },
        {
            title: gettext("Remove"),
            type: "action",
            tooltip: gettext("Remove the code block."),
            order: 2,
            action: (editor: Editor) => {
                const view = editor.currentView
                const tr = view.state.tr.deleteSelection()
                view.dispatch(tr)
                return false
            }
        }
    ] as MenuModelItem[]
})
