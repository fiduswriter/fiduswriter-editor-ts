import {Plugin, PluginKey} from "prosemirror-state"
import type {EditorView} from "prosemirror-view"

import {ToolbarView} from "../menus/index.js"
import type {Editor} from "../types.js"

const key = new PluginKey("toolbar")
export const toolbarPlugin = (options: {editor: Editor}) =>
    new Plugin({
        key,
        view(editorView: EditorView) {
            return new ToolbarView(editorView, options)
        }
    })
