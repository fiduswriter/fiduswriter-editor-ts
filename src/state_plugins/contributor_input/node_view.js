import {AddButton, ContributorsPartView as CommonContributorsPartView} from "@fiduswriter/common/state_plugins/contributor_input"

import {ContributorDialog} from "../../dialogs/index.js"
import {addDeletedPartWidget} from "../document_template.js"

class EditorAddButton extends AddButton {
    handleActivation(event) {
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
    constructor(node, view, getPos) {
        super(node, view, getPos, {
            addDeletedPartWidget,
            AddButton: EditorAddButton
        })
    }
}
