import {
    TagsPartView as CommonTagsPartView,
    createTagEditor as commonCreateTagEditor
} from "@fiduswriter/common/state_plugins/tag_input"

import {addDeletedPartWidget} from "../document_template.js"
import {shouldPreventTagInputFocus} from "./plugin.js"

const createTagEditor = (view, getPos, getNode) =>
    commonCreateTagEditor(view, getPos, getNode)

export class TagsPartView extends CommonTagsPartView {
    constructor(node, view, getPos) {
        super(node, view, getPos, {
            addDeletedPartWidget,
            createTagEditor,
            shouldPreventTagInputFocus
        })
    }
}
