import {GapCursor} from "prosemirror-gapcursor"
import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import type {ResolvedPos} from "prosemirror-model"

const posHidden = ($pos: ResolvedPos) => {
    let hidden = false
    for (let i = $pos.depth; i > 0; i--) {
        const node = $pos.node(i)
        if (
            node.attrs.hidden ||
            (["table_caption", "figure_caption"].includes(node.type.name) &&
                $pos.node(i - 1).attrs.caption === false)
        ) {
            hidden = true
        }
    }
    return hidden
}

const key = new PluginKey("jump-hidden-nodes")
export const jumpHiddenNodesPlugin = (_options: {editor: unknown}) =>
    new Plugin({
        key,
        appendTransaction: (trs, oldState, state) => {
            if (!state.selection.empty) {
                // Only applies to collapsed selection
                return
            }
            const selectionSet = trs.find(tr => tr.selectionSet)
            if (selectionSet && posHidden(state.selection.$from)) {
                const dir =
                    state.selection.from > oldState.selection.from ? 1 : -1
                let newPos = state.selection.from,
                    hidden = true,
                    validTextSelection = false,
                    validGapCursor = false
                let $pos: ResolvedPos = state.selection.$from
                while (hidden || (!validGapCursor && !validTextSelection)) {
                    newPos += dir
                    if (newPos === 0 || newPos === state.doc.nodeSize) {
                        // Could not find any valid position
                        return
                    }
                    $pos = state.doc.resolve(newPos)
                    validTextSelection = $pos.parent.inlineContent
                    validGapCursor = (GapCursor as any).valid($pos)
                    hidden = posHidden($pos)
                }
                const selection = validTextSelection
                    ? new TextSelection($pos)
                    : new GapCursor($pos)
                return state.tr.setSelection(selection)
            }
            // Handle boundary crossing: cursor is at the start of a visible
            // doc-level part whose preceding sibling is hidden. Use
            // childBefore to check whether the previous doc child is hidden.
            if (
                selectionSet &&
                !posHidden(state.selection.$from) &&
                state.selection.$from.depth >= 2
            ) {
                const $pos = state.selection.$from
                const prevChild = state.doc.childBefore($pos.pos)
                if (
                    prevChild &&
                    prevChild.node &&
                    prevChild.node.attrs.hidden
                ) {
                    const dir = -1
                    let newPos = state.selection.from,
                        hidden = true,
                        validTextSelection = false,
                        validGapCursor = false
                    let new$pos: ResolvedPos = state.selection.$from
                    while (
                        hidden ||
                        (!validGapCursor && !validTextSelection)
                    ) {
                        newPos += dir
                        if (newPos === 0) {
                            return
                        }
                        new$pos = state.doc.resolve(newPos)
                        validTextSelection = new$pos.parent.inlineContent
                        validGapCursor = (GapCursor as any).valid(new$pos)
                        hidden = posHidden(new$pos)
                    }
                    const selection = validTextSelection
                        ? new TextSelection(new$pos)
                        : new GapCursor(new$pos)
                    return state.tr.setSelection(selection)
                }
            }
            return undefined
        }
    })
