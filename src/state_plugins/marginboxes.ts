import {Plugin, PluginKey} from "prosemirror-state"
import type {EditorView} from "prosemirror-view"

import type {Editor} from "../types.js"

const key = new PluginKey("marginboxes")
export const marginboxesPlugin = (options: {editor: Editor}) =>
    new Plugin({
        key,
        view(_editorState) {
            return {
                update: (view: EditorView, _prevState) => {
                    ;(options.editor.mod.marginboxes as {view(v: EditorView): void}).view(view)
                }
            }
        }
    })
