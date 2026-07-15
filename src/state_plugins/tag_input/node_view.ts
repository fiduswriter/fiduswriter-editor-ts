import {
    TagsPartView as CommonTagsPartView,
    createTagEditor as commonCreateTagEditor
} from "@fiduswriter/common/state_plugins/tag_input"
import type {Node} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

import {addDeletedPartWidget} from "../document_template.js"
import {shouldPreventTagInputFocus} from "./plugin.js"

const createTagEditor = (
    view: EditorView,
    getPos: () => number | undefined,
    getNode: () => Node
) => commonCreateTagEditor(view, getPos, getNode)

export class TagsPartView extends CommonTagsPartView {
    constructor(
        node: Node,
        view: EditorView,
        getPos: () => number | undefined
    ) {
        super(node, view, getPos, {
            addDeletedPartWidget,
            createTagEditor,
            shouldPreventTagInputFocus
        })
    }
}
