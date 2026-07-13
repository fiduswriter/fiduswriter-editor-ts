import {Plugin, PluginKey} from "prosemirror-state"

import {HeaderbarView} from "../menus/index.js"

const key = new PluginKey("header")
export const headerbarPlugin = options =>
    new Plugin({
        key,
        view(editorView) {
            return new HeaderbarView(editorView, options)
        }
    })
