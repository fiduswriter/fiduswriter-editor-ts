import {Plugin, PluginKey} from "prosemirror-state"

import {ToolbarView} from "../menus/index.js"

const key = new PluginKey("toolbar")
export const toolbarPlugin = options =>
    new Plugin({
        key,
        view(editorView) {
            return new ToolbarView(editorView, options)
        }
    })
