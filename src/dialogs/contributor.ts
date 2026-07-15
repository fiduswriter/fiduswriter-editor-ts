import {Dialog, addAlert} from "fwtoolkit"
import {NodeSelection} from "prosemirror-state"
import type {Node} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

import {contributorTemplate} from "./templates.js"

const emailRegExp =
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export class ContributorDialog {
    node: Node
    view: EditorView
    contributor: Record<string, unknown> | false
    idTypes: string[]
    dialog: InstanceType<typeof Dialog> | false

    constructor(
        node: Node,
        view: EditorView,
        contributor: Record<string, unknown> | false = false,
        idTypes: string[] = []
    ) {
        this.node = node
        this.view = view
        this.contributor = contributor
        console.log("ContirbutorDialog", {node, view, contributor, idTypes})
        this.idTypes = idTypes
        this.dialog = false
    }

    init(): void {
        const buttons = []
        // Add Update/Add button
        const dialogEl = (this.dialog as InstanceType<typeof Dialog>).dialogEl

        buttons.push({
            text: this.contributor ? gettext("Update") : gettext("Add"),
            classes: "fw-dark",
            click: () => {
                // Get form values
                let firstname: string | false = (
                        dialogEl.querySelector("input[name=firstname]") as
                            | HTMLInputElement
                            | null
                    )?.value || false,
                    lastname: string | false = (
                        dialogEl.querySelector("input[name=lastname]") as
                            | HTMLInputElement
                            | null
                    )?.value || false,
                    email: string | false = (
                        dialogEl.querySelector("input[name=email]") as
                            | HTMLInputElement
                            | null
                    )?.value || false,
                    institution: string | false = (
                        dialogEl.querySelector("input[name=institution]") as
                            | HTMLInputElement
                            | null
                    )?.value || false,
                    id_type: string | false = false,
                    id_value: string | false = false

                firstname = firstname && firstname.length ? firstname : false
                lastname = lastname && lastname.length ? lastname : false
                institution = institution && institution.length ? institution : false
                email = email && email.length ? email : false

                // Get ID type/value if fields are shown
                if (this.idTypes && this.idTypes.length > 0) {
                    const idTypeEl = dialogEl.querySelector("[name=id_type]") as
                        | HTMLInputElement
                        | HTMLSelectElement
                        | null
                    if (idTypeEl && idTypeEl.value) {
                        id_type = idTypeEl.value
                        const idValueInput = dialogEl.querySelector(
                            "input[name=id_value]"
                        ) as HTMLInputElement | null
                        if (idValueInput && idValueInput.value) {
                            id_value = idValueInput.value
                            // Validate id_value against selected id_type's regex
                            const selectedType = this.idTypes.find(
                                t => t === id_type
                            )
                            if (selectedType && (selectedType as unknown as {regex?: string}).regex) {
                                const regex = new RegExp(
                                    (selectedType as unknown as {regex?: string}).regex as string
                                )
                                if (!regex.test(id_value)) {
                                    addAlert(
                                        "error",
                                        gettext(
                                            "ID Value format is incorrect for "
                                        ) + id_type
                                    )
                                    return
                                }
                            }
                        }
                    }
                }

                // Validate email format
                if (email && !emailRegExp.test(email)) {
                    addAlert("error", gettext("Email is in incorrect format!"))
                    return
                }

                ;(this.dialog as InstanceType<typeof Dialog>).close()

                // Don't create contributor if all fields are empty
                if (!firstname && !lastname && !institution && !email) {
                    // No data, don't insert.
                    return
                }

                const view = this.view,
                    newNode = view.state.schema.nodes.contributor.create({
                        firstname,
                        lastname,
                        email,
                        institution,
                        id_type,
                        id_value
                    } as any)
                let tr

                // Check if we're editing an existing contributor based on current selection
                // This works for collaborative editing because we use current selection, not saved positions
                if (
                    this.contributor &&
                    view.state.selection instanceof NodeSelection &&
                    view.state.selection.node.type.name === "contributor"
                ) {
                    // Editing: replace the selected contributor
                    tr = view.state.tr.replaceSelectionWith(newNode, false)
                    // Set selection to the updated contributor
                    tr.setSelection(
                        NodeSelection.create(tr.doc, view.state.selection.from)
                    )
                } else {
                    // Adding: find the insertion point based on current document state
                    let posFrom: number | undefined,
                        posTo: number | undefined
                    view.state.doc.descendants((node, pos) => {
                        // Find the contributors_part node to determine insertion position
                        if (node.attrs.id === this.node.attrs.id) {
                            posFrom = posTo = pos + node.nodeSize - 1
                            // - 1 to go to end of node contributors container node
                        }
                        if ("id" in node.attrs) {
                            return false
                        }
                        return true
                    })
                    tr = view.state.tr.replaceRangeWith(
                        posFrom as number,
                        posTo as number,
                        newNode
                    )
                    // Set selection to the newly created contributor
                    tr.setSelection(
                        NodeSelection.create(tr.doc, posFrom as number)
                    )
                }
                // Dispatch the transaction (both replacement and selection)
                view.dispatch(tr)
                return
            }
        })

        buttons.push({
            type: "cancel" as const
        })

        // Create and open the dialog

        this.dialog = new Dialog({
            id: "edit-contributor",
            title: `${this.contributor ? gettext("Update") : gettext("Add")} ${(this.node.attrs.item_title as string).toLowerCase()}`,
            body: contributorTemplate({
                contributor: this.contributor ? this.contributor : {},
                idTypes: this.idTypes as never[]
            }),
            width: 836,
            height: 360,
            buttons,
            // Focus the editor view when dialog closes
            onClose: () => this.view.focus(),
            // Don't restore previous active element (dialog handles focus)
            restoreActiveElement: false
        })

        this.dialog.open()
    }
}
