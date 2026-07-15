import type {Node as ProseMirrorNode} from "prosemirror-model"
import {TextSelection, type NodeSelection} from "prosemirror-state"

import {Dialog} from "fwtoolkit"

import type {Editor} from "../types.js"

interface DialogButtonSpec {
    text?: string
    classes?: string
    click?: () => void
    type?: "cancel" | "close" | "ok"
}
import {getInternalTargets} from "../state_plugins/index.js"
import {linkDialogTemplate} from "./templates.js"

interface InternalTarget {
    id: string
    text: string
}

interface AllowedContent {
    link: boolean
    cross_reference: boolean
}

export class LinkDialog {
    editor: Editor
    target: string | false
    linkType: string
    defaultLink: string
    title: string
    submitButtonText: string
    dialog: InstanceType<typeof Dialog> | false
    internalTargets: InternalTarget[]

    constructor(editor: Editor) {
        this.editor = editor
        this.target = false // cross reference or internal link
        this.linkType = "external"
        this.defaultLink = "https://"
        this.title = ""
        this.submitButtonText = gettext("Insert")
        this.dialog = false
        this.internalTargets = []
    }

    init(): void {
        this.checkCrossReference()
        if (!this.target) {
            this.checkLink()
        }
        this.internalTargets = (
            getInternalTargets(
                this.editor.view.state,
                this.editor.view.state.doc.attrs.language,
                "main"
            ) as InternalTarget[]
        ).concat(
            getInternalTargets(
                (this.editor.mod as any).footnotes.fnEditor.view.state,
                this.editor.view.state.doc.attrs.language,
                "foot"
            ) as InternalTarget[]
        )
        this.createDialog()
    }

    // Check if there is an existing link at the selection. If this is the case
    // use its values in dialog.
    checkLink(): void {
        const state = this.editor.currentView.state,
            from = state.selection.from,
            linkMark = state.selection.$from
                .marks()
                .find(mark => mark.type.name === "link")
        if (linkMark) {
            if (linkMark.attrs.href[0] === "#") {
                this.linkType = "internal"
                this.target = linkMark.attrs.href.slice(1)
            } else {
                this.linkType = "external"
                this.target = linkMark.attrs.href
                this.title = linkMark.attrs.title ? linkMark.attrs.title : ""
            }
            this.extendSelectionToMark(from, linkMark)
            this.submitButtonText = gettext("Update")
        }
    }

    // Check if the selection spans over exactly one cross reference node. If so, use it.
    checkCrossReference(): void {
        const node = (this.editor.currentView.state.selection as NodeSelection)
            .node
        if (node?.type.name === "cross_reference") {
            this.submitButtonText = gettext("Update")
            this.target = node.attrs.id
            this.linkType = "cross_reference"
        }
    }

    // To check whether links, cross references or both can be added in current position.
    checkAllowedContent(): AllowedContent {
        if (this.editor.currentView === this.editor.view) {
            const settings = this.editor.view.state.selection.$anchor.node(1)
                .attrs
            return {
                link: settings.marks.includes("link"),
                cross_reference: settings.elements.includes("cross_reference")
            }
        } else {
            const settings = this.editor.view.state.doc.attrs
            return {
                link: settings.footnote_marks.includes("link"),
                cross_reference:
                    settings.footnote_elements.includes("cross_reference")
            }
        }
    }

    // Find the start and end of the link currently selected.
    extendSelectionToMark(pos: number, mark: ProseMirrorNode["marks"][0]): void {
        const view = this.editor.currentView,
            state = view.state,
            $pos = state.doc.resolve(pos)
        let startIndex = $pos.index(),
            endIndex = $pos.indexAfter()

        while (
            startIndex > 0 &&
            mark.isInSet($pos.parent.child(startIndex - 1).marks)
        ) {
            startIndex--
        }
        while (
            endIndex < $pos.parent.childCount &&
            mark.isInSet($pos.parent.child(endIndex).marks)
        ) {
            endIndex++
        }
        let startPos = $pos.start(),
            endPos = startPos

        for (let i = 0; i < endIndex; i++) {
            const size = $pos.parent.child(i).nodeSize
            if (i < startIndex) {
                startPos += size
            }
            endPos += size
        }
        view.dispatch(
            state.tr.setSelection(
                TextSelection.create(state.doc, startPos, endPos)
            )
        )
    }

    createDialog(): void {
        const buttons: DialogButtonSpec[] = []
        buttons.push({
            text: this.submitButtonText,
            classes: "fw-dark",
            click: () => {
                const linkTypeEl = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                        "input[name=link-type]:checked"
                    ) as HTMLInputElement | null,
                    linkType = linkTypeEl ? linkTypeEl.value : "external"
                let href: string | undefined,
                    title: string | undefined,
                    target: string | false = false,
                    change: boolean = false

                switch (linkType) {
                    case "internal": {
                        target = (
                            (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                                "select.internal-link-selector"
                            ) as HTMLSelectElement
                        ).value
                        href = `#${target}`
                        title = (
                            this.internalTargets.find(
                                iTarget => iTarget.id === target
                            ) as InternalTarget
                        ).text
                        change =
                            !!target &&
                            (this.linkType !== "internal" ||
                                this.target !== target)
                        break
                    }
                    case "external": {
                        const linkEl =
                            (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector("input.link") as
                                HTMLInputElement
                        if (
                            !/^\s*$/.test(linkEl.value) &&
                            linkEl.value !== this.defaultLink
                        ) {
                            href = linkEl.value
                        }
                        title = (
                            (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                                "input.link-title"
                            ) as HTMLInputElement
                        ).value
                        if (/^\s*$/.test(title || "")) {
                            // The link title is empty. Make it the same as the link itself.
                            title = href || ""
                        }
                        change =
                            !!href &&
                            (this.linkType !== "external" ||
                                this.target !== href ||
                                this.title !== title)
                        break
                    }
                    case "cross_reference": {
                        target = (
                            (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                                "select.cross-reference-selector"
                            ) as HTMLSelectElement
                        ).value
                        title = (
                            this.internalTargets.find(
                                iTarget => iTarget.id === target
                            ) as InternalTarget
                        ).text
                        change =
                            !!target &&
                            (this.linkType !== "cross_reference" ||
                                this.target !== target)
                        break
                    }
                    default:
                        target = false
                        change = false
                }
                (this.dialog as InstanceType<typeof Dialog>).close()

                if (!change) {
                    // The link input is empty or hasn't been changed from the default value.
                    // Just close the dialog.
                    this.editor.currentView.focus()
                    return
                }

                const view = this.editor.currentView,
                    posFrom = view.state.selection.from,
                    tr = view.state.tr
                let posTo = view.state.selection.to

                if (linkType === "cross_reference") {
                    const node = view.state.schema.nodes.cross_reference.create(
                        {
                            id: target,
                            title
                        }
                    )
                    tr.replaceSelectionWith(node)
                } else {
                    // There is an empty selection. We insert the link title into the editor
                    // and then add the link to that.
                    if (posFrom === posTo) {
                        tr.insertText(title || "", posFrom, posTo)
                        posTo = tr.mapping.map(posFrom, 1)
                    }
                    const markType = view.state.schema.marks.link.create({
                        href,
                        title
                    })
                    tr.addMark(posFrom, posTo, markType)
                }
                view.dispatch(tr)
                view.focus()
                return
            }
        })

        buttons.push({
            type: "cancel"
        })

        const initialFocus =
            this.linkType === "cross_reference"
                ? "select.cross-reference-selector"
                : this.linkType === "internal"
                  ? "select.internal-link-selector"
                  : "input.link-title"

        this.dialog = new Dialog({
            id: "edit-link",
            title: gettext("Link"),
            body: linkDialogTemplate({
                target: this.target as string,
                allowedContent: this.checkAllowedContent(),
                title: this.title,
                linkType: this.linkType,
                defaultLink: this.defaultLink,
                internalTargets: this.internalTargets
            }),
            buttons,
            width: 836,
            height: 360,
            onClose: () => this.editor.currentView.focus(),
            restoreActiveElement: false,
            initialFocus
        })

        this.dialog.open()

        if (this.internalTargets.length) {
            const externalEls = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelectorAll(
                    "input.link, input.link-title"
                ),
                internalEls = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelectorAll(
                    "select.internal-link-selector"
                ),
                crossReferenceEls = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelectorAll(
                    "select.cross-reference-selector"
                ),
                externalSwitchers = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelectorAll(
                    "input.link, input.link-title, label.link-external-label, input.link-external-check"
                ),
                internalSwitchers = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelectorAll(
                    "select.internal-link-selector, label.link-internal-label, input.link-internal-check"
                ),
                crossReferenceSwitchers = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelectorAll(
                    "select.cross-reference-selector, label.cross-reference-label, input.cross-reference-check"
                ),
                radioInternal = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                    "input.link-internal-check"
                ) as HTMLInputElement,
                radioExternal = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                    "input.link-external-check"
                ) as HTMLInputElement,
                radioCrossReference = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                    "input.cross-reference-check"
                ) as HTMLInputElement

            switch (this.linkType) {
                case "internal":
                    externalEls.forEach(el => el.classList.add("fw-disabled"))
                    crossReferenceEls.forEach(el =>
                        el.classList.add("fw-disabled")
                    )
                    radioInternal.checked = true
                    break
                case "external":
                    internalEls.forEach(el => el.classList.add("fw-disabled"))
                    crossReferenceEls.forEach(el =>
                        el.classList.add("fw-disabled")
                    )
                    radioExternal.checked = true
                    break
                case "cross_reference":
                    internalEls.forEach(el => el.classList.add("fw-disabled"))
                    externalEls.forEach(el => el.classList.add("fw-disabled"))
                    radioCrossReference.checked = true
                    break
                default:
                    break
            }

            internalSwitchers.forEach(el =>
                el.addEventListener("click", () => {
                    externalEls.forEach(el => el.classList.add("fw-disabled"))
                    internalEls.forEach(el =>
                        el.classList.remove("fw-disabled")
                    )
                    crossReferenceEls.forEach(el =>
                        el.classList.add("fw-disabled")
                    )
                    radioInternal.checked = true
                })
            )

            externalSwitchers.forEach(el =>
                el.addEventListener("click", () => {
                    internalEls.forEach(el => el.classList.add("fw-disabled"))
                    externalEls.forEach(el =>
                        el.classList.remove("fw-disabled")
                    )
                    crossReferenceEls.forEach(el =>
                        el.classList.add("fw-disabled")
                    )
                    radioExternal.checked = true
                })
            )

            crossReferenceSwitchers.forEach(el =>
                el.addEventListener("click", () => {
                    internalEls.forEach(el => el.classList.add("fw-disabled"))
                    externalEls.forEach(el => el.classList.add("fw-disabled"))
                    crossReferenceEls.forEach(el =>
                        el.classList.remove("fw-disabled")
                    )
                    radioCrossReference.checked = true
                })
            )
        }
    }
}
