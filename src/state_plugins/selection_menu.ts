import {Plugin, PluginKey} from "prosemirror-state"
import type {EditorView} from "prosemirror-view"

import {SelectionMenuView} from "../menus/index.js"
import type {Editor} from "../types.js"

const key = new PluginKey("toolbar")
export const selectionMenuPlugin = (options: {editor: Editor}) =>
    new Plugin({
        key,
        view(editorView: EditorView) {
            return new SelectionMenuView(editorView, options)
        }
    })
