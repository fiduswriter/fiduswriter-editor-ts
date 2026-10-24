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
import {TextSelection} from "prosemirror-state"
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
    // When the caret is at the very end of the title field and the user hits
    // Enter, move it to the next visible field (subtitle, authors, abstract,
    // body, ...). Splitting the title is not allowed by the schema, so
    // without this Enter would do nothing at all.
    const moveCaretToNextField: Command = (state: EditorState, dispatch) => {
        const {selection} = state
        if (!selection.empty || !schema.nodes.title) {
            return false
        }
        const $from = selection.$from
        if (
            $from.parent.type !== schema.nodes.title ||
            $from.parentOffset < $from.parent.content.size
        ) {
            // Only applies at the very end of the title field.
            return false
        }
        let $pos = state.doc.resolve($from.after())
        let node = $pos.nodeAfter
        while (node?.attrs.hidden) {
            // Skip fields that are not visible.
            $pos = state.doc.resolve($pos.pos + node.nodeSize)
            node = $pos.nodeAfter
        }
        if (!node) {
            // The title is the only content of the document.
            return false
        }
        const nextSelection = TextSelection.near(
            state.doc.resolve($pos.pos + 1),
            1
        )
        if (nextSelection.from <= $from.after()) {
            // No caret position further ahead (e.g. only a table of
            // contents part follows).
            return false
        }
        if (dispatch) {
            dispatch(state.tr.setSelection(nextSelection).scrollIntoView())
        }
        return true
    }
    const editorKeymap: Record<string, Command> = {
        Enter: moveCaretToNextField,
        Backspace: (state: EditorState, dispatch, view?: EditorView) =>
            backspace(
                state,
                tr => dispatch!(addInputType(tr, "deleteContentBackward")),
                view
            ),
        "Mod-z": (state: EditorState, dispatch, view?: EditorView) =>
            undo(state, tr => dispatch!(addInputType(tr, "historyUndo")), view),
        "Shift-Mod-z": (state: EditorState, dispatch, view?: EditorView) =>
            redo(state, tr => dispatch!(addInputType(tr, "historyRedo")), view),
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
        editorKeymap["Mod-y"] = (
            state: EditorState,
            dispatch,
            view?: EditorView
        ) => redo(state, tr => dispatch!(addInputType(tr, "historyRedo")), view)
    }
    return editorKeymap
}
