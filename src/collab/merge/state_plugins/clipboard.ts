import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {DOMSerializer} from "prosemirror-model"
import type {Slice} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

import {docClipboardSerializer} from "../../../clipboard/copy/index.js"
import type {Editor} from "../../../types.js"

const key = new PluginKey("clipboard")
export const clipboardPlugin = (options: {editor: Editor}) => {
    return new Plugin({
        key,
        props: {
            handleDrop: (
                view: EditorView,
                event: DragEvent,
                slice: Slice,
                moved: boolean
            ) => {
                if (moved || (slice && slice.size)) {
                    return false // Something other than en empty plain text string from outside. Handled by PM already.
                }
                const eventPos = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY
                })
                if (!eventPos) {
                    return false
                }
                const $mouse = view.state.doc.resolve(eventPos.pos)
                if (!$mouse) {
                    return false
                }
                const tr = view.state.tr
                tr.setSelection(new TextSelection($mouse))
                view.dispatch(tr)
                return true
            },
            clipboardSerializer: docClipboardSerializer(options.editor) as unknown as DOMSerializer
        }
    })
}
