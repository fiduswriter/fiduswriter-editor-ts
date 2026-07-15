import {Plugin, PluginKey} from "prosemirror-state"
import type {EditorView} from "prosemirror-view"

import {HeaderbarView} from "../menus/index.js"
import type {Editor} from "../types.js"

const key = new PluginKey("header")
export const headerbarPlugin = (options: {editor: Editor}) =>
    new Plugin({
        key,
        view(editorView: EditorView) {
            return new HeaderbarView(editorView, options)
        }
    })
