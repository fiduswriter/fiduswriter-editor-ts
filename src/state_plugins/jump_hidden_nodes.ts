import {GapCursor} from "prosemirror-gapcursor"
import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import type {ResolvedPos} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

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
        props: {
            handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
                if (event.key !== "ArrowLeft") {
                    return false
                }
                const {selection, doc} = view.state
                if (!selection.empty) {
                    return false
                }
                const $pos = selection.$from
                if ($pos.depth < 2) {
                    return false
                }
                // Intercept ArrowLeft when at the beginning of a textblock
                // OR inside an empty textblock whose preceding doc-level
                // sibling is hidden.  This handles the case where clicking
                // an empty body paragraph and pressing LEFT should land in
                // the abstract (skipping hidden parts like keywords).
                const atStart = $pos.parentOffset === 0
                const isEmptyTextblock =
                    $pos.parent.type.isTextblock &&
                    $pos.parent.content.size === 0
                if (!atStart && !isEmptyTextblock) {
                    return false
                }
                // Find previous sibling of the parent doc-level node
                const {index} = (doc.content as any).findIndex($pos.pos)
                if (index < 1) {
                    return false
                }
                const prevSibling = doc.child(index - 1)
                if (!prevSibling.attrs.hidden) {
                    return false
                }
                // Walk backward to the previous non-hidden position
                const dir = -1
                let newPos = selection.from,
                    hidden = true,
                    validTextSelection = false,
                    validGapCursor = false
                let new$pos: ResolvedPos = selection.$from
                while (
                    hidden ||
                    (!validGapCursor && !validTextSelection)
                ) {
                    newPos += dir
                    if (newPos === 0) {
                        return false
                    }
                    new$pos = doc.resolve(newPos)
                    validTextSelection = new$pos.parent.inlineContent
                    validGapCursor = (GapCursor as any).valid(new$pos)
                    hidden = posHidden(new$pos)
                }
                const trSelection = validTextSelection
                    ? new TextSelection(new$pos)
                    : new GapCursor(new$pos)
                view.dispatch(
                    view.state.tr.setSelection(trSelection)
                )
                return true
            }
        },
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
            // findIndex to locate the previous doc child and check if
            // it is hidden.
            if (
                selectionSet &&
                !posHidden(state.selection.$from) &&
                state.selection.$from.depth >= 2
            ) {
                const $pos = state.selection.$from
                const {index} = (state.doc.content as any).findIndex($pos.pos)
                if (index >= 1) {
                    const prevSibling = state.doc.child(index - 1)
                    if (prevSibling.attrs.hidden) {
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
                            validTextSelection =
                                new$pos.parent.inlineContent
                            validGapCursor = (GapCursor as any).valid(
                                new$pos
                            )
                            hidden = posHidden(new$pos)
                        }
                        const selection = validTextSelection
                            ? new TextSelection(new$pos)
                            : new GapCursor(new$pos)
                        return state.tr.setSelection(selection)
                    }
                }
            }
            return undefined
        }
    })
