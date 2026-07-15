import {
    chainCommands,
    deleteSelection,
    joinBackward,
    selectNodeBackward,
    toggleMark
} from "prosemirror-commands"
import {redo, undo} from "prosemirror-history"
import {liftListItem} from "prosemirror-schema-list"
import type {Node, NodeType, Schema} from "prosemirror-model"
import type {Command, EditorState, Transaction} from "prosemirror-state"
import type {EditorView} from "prosemirror-view"

const mac =
    typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false

const backspace = chainCommands(
    deleteSelection,
    joinBackward,
    selectNodeBackward
)
const addInputType = (tr: Transaction, inputType: string) =>
    tr.setMeta("inputType", inputType)

/* Adjusted version of setBlockType that preserves attributes */
/* source https://github.com/ProseMirror/prosemirror-commands/blob/b9ceb06e340ffcb3e12cd214f58939e81c0b61af/src/commands.js#L414-L432 */
export function setBlockType(
    nodeType: NodeType,
    attrs: Record<string, unknown> = {}
): Command {
    return (state, dispatch) => {
        const {from, to} = state.selection
        const tr = state.tr
        state.doc.nodesBetween(from, to, (node: Node, pos: number) => {
            if (!node.isTextblock || node.hasMarkup(nodeType, attrs)) {
                return
            }
            let applicable = false
            if (node.type == nodeType) {
                applicable = true
            } else {
                const $pos = state.doc.resolve(pos),
                    index = $pos.index()
                applicable = $pos.parent.canReplaceWith(
                    index,
                    index + 1,
                    nodeType
                )
            }
            if (applicable) {
                tr.setBlockType(
                    pos,
                    pos + node.nodeSize,
                    nodeType,
                    Object.assign({}, node.attrs, attrs) // preserve existing attributes
                )
            }
        })
        if (!tr.steps.length) {
            return false
        }
        if (dispatch) {
            dispatch(tr.scrollIntoView())
        }
        return true
    }
}

export const buildEditorKeymap = (schema: Schema) => {
    const editorKeymap: Record<string, Command> = {
        Backspace: (state: EditorState, dispatch, view?: EditorView) =>
            backspace(
                state,
                tr => dispatch!(addInputType(tr, "deleteContentBackward")),
                view
            ),
        "Mod-z": (state: EditorState, dispatch, view?: EditorView) =>
            undo(
                state,
                tr => dispatch!(addInputType(tr, "historyUndo")),
                view
            ),
        "Shift-Mod-z": (state: EditorState, dispatch, view?: EditorView) =>
            redo(
                state,
                tr => dispatch!(addInputType(tr, "historyRedo")),
                view
            ),
        "Shift-Ctrl-0": setBlockType(schema.nodes.paragraph),
        "Shift-Ctrl-\\": setBlockType(schema.nodes.code_block),
        "Ctrl-<": liftListItem(schema.nodes.list_item),
        "Mod-.": (state: EditorState, dispatch) => {
            const mark = schema.marks.sup
            const command = toggleMark(mark)
            return command(state, dispatch)
        },
        "Mod-,": (state: EditorState, dispatch) => {
            const mark = schema.marks.sub
            const command = toggleMark(mark)
            return command(state, dispatch)
        },
        "Mod-'": (state: EditorState, dispatch) => {
            const mark = schema.marks.code
            const command = toggleMark(mark)
            return command(state, dispatch)
        }
    }
    for (let i = 1; i <= 6; i++) {
        editorKeymap["Shift-Ctrl-" + i] = setBlockType(schema.nodes.heading, {
            level: i
        })
    }
    if (!mac) {
        editorKeymap["Mod-y"] = (state: EditorState, dispatch, view?: EditorView) =>
            redo(
                state,
                tr => dispatch!(addInputType(tr, "historyRedo")),
                view
            )
    }
    return editorKeymap
}
