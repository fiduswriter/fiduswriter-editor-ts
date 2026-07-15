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
            if (state.selection.from !== state.selection.to) {
                // Only applies to collapsed selection
                return
            }
            const selection = state.selection
            let $pos = selection.$from
            if (!posHidden($pos)) {
                return
            }
            let movedRight = false,
                movedLeft = false
            const startPos = $pos.pos
            while ($pos.depth > 1 && posHidden($pos)) {
                $pos = state.doc.resolve($pos.after())
                movedRight = true
            }
            if (!movedRight) {
                $pos = selection.$from
                while ($pos.depth > 1 && posHidden($pos)) {
                    $pos = state.doc.resolve($pos.before())
                    movedLeft = true
                }
            }
            if (!movedRight && !movedLeft) {
                return
            }
            let tr = state.tr
            if (
                $pos.node().isTextblock &&
                $pos.pos >= startPos &&
                $pos.pos <= startPos
            ) {
                // Try to set text selection
                tr = tr.setSelection(TextSelection.near($pos))
            } else if ($pos.pos !== startPos) {
                tr = tr.setSelection(new GapCursor($pos))
            }
            if (trs[trs.length - 1].doc.eq(tr.doc)) {
                return tr
            }
            return
        }
    })
