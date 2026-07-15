import {
    AddButton,
    ContributorsPartView as CommonContributorsPartView
} from "@fiduswriter/common/state_plugins/contributor_input"
import type {Node} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

import {ContributorDialog} from "../../dialogs/index.js"
import {addDeletedPartWidget} from "../document_template.js"

class EditorAddButton extends AddButton {
    handleActivation(event: Event) {
        event.preventDefault()
        const node = this.getNode()

        const dialog = new ContributorDialog(
            node,
            this.view,
            false,
            this.idTypes
        )
        dialog.init()
    }
}

export class ContributorsPartView extends CommonContributorsPartView {
    constructor(
        node: Node,
        view: EditorView,
        getPos: () => number | undefined
    ) {
        super(node, view, getPos as () => number, {
            addDeletedPartWidget,
            AddButton: EditorAddButton
        })
    }
}
