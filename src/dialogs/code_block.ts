import {randomCodeBlockId} from "@fiduswriter/document/schema/document/content"
import {CATS} from "@fiduswriter/document/schema/i18n"
import {Dialog, dropdownSelect} from "fwtoolkit"
import type {Node, NodeType} from "prosemirror-model"
import type {EditorState, Transaction} from "prosemirror-state"

import type {Editor} from "../types.js"

export class CodeBlockDialog {
    editor: Editor
    language: string
    category: string
    title: string
    id: string
    insideCodeBlock: boolean
    node: Node | false
    submitMessage: string
    dialog: InstanceType<typeof Dialog> | false
    languageSelector?: ReturnType<typeof dropdownSelect>
    categorySelector?: ReturnType<typeof dropdownSelect>

    constructor(editor: Editor) {
        this.editor = editor
        this.language = ""
        this.category = ""
        this.title = ""
        this.id = ""
        this.insideCodeBlock = false
        this.node = false
        this.submitMessage = gettext("Insert")
        this.dialog = false
    }

    findCodeBlock(state: EditorState): Node | false {
        const selection = state.selection as any
        if (
            selection.node &&
            selection.node.type.name === "code_block"
        ) {
            return selection.node
        }
        const $head = state.selection.$head
        for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type.name === "code_block") {
                return $head.node(d)
            }
        }
        return false
    }

    submitForm(): void {
        const view = this.editor.currentView
        const {state} = view
        const {schema} = state

        const newAttrs = {
            language: this.language,
            category: this.category,
            title: this.title,
            id: this.insideCodeBlock
                ? (this.node as Node).attrs.id ||
                  (this.category ? randomCodeBlockId() : "")
                : this.category
                  ? randomCodeBlockId()
                  : "",
            track: this.insideCodeBlock
                ? (this.node as Node).attrs.track
                : []
        }

        let tr: Transaction

        if (this.insideCodeBlock) {
            // Update existing code block using setNodeMarkup
            const $from = state.selection.$from

            // Find the actual code_block position
            let codeBlockDepth = -1
            for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type.name === "code_block") {
                    codeBlockDepth = d
                    break
                }
            }

            const pos =
                codeBlockDepth > 0
                    ? $from.before(codeBlockDepth)
                    : state.selection.from

            tr = state.tr.setNodeMarkup(pos, null, newAttrs)
        } else {
            // Insert new code block
            const codeBlockNode = (schema.nodes.code_block as NodeType).create(
                newAttrs
            )
            tr = state.tr.replaceSelectionWith(codeBlockNode, false)
        }

        view.dispatch(tr)
        ;(this.dialog as InstanceType<typeof Dialog>).close()
    }

    getEnabledCategories(): string[] {
        const codeCategories =
            (this.editor.view.state.doc.attrs.code_categories as Record<
                string,
                {enabled: boolean}
            >) || {}
        const categories: string[] = []

        Object.entries(codeCategories).forEach(([key, value]) => {
            if (value.enabled) {
                categories.push(key)
            }
        })

        return categories
    }

    getAvailableLanguages(): string[] {
        return (this.editor.view.state.doc.attrs.code_languages as string[]) ||
            []
    }

    init(): boolean | void {
        this.node = this.findCodeBlock(this.editor.currentView.state)

        if (
            this.node &&
            this.node.attrs.track?.find(
                (track: {type: string}) => track.type === "deletion"
            )
        ) {
            // The code block is marked as deleted so we don't allow editing it.
            return true
        }

        const buttons: any[] = []

        if (this.node && this.node.type.name === "code_block") {
            this.insideCodeBlock = true
            this.submitMessage = gettext("Update")
            this.language = this.node.attrs.language || ""
            this.category = this.node.attrs.category || ""
            this.title = this.node.attrs.title || ""
            this.id = this.node.attrs.id || ""

            buttons.push({
                text: gettext("Remove"),
                classes: "fw-orange",
                click: () => {
                    const tr =
                        this.editor.currentView.state.tr.deleteSelection()
                    this.editor.currentView.dispatch(tr)
                    ;(this.dialog as InstanceType<typeof Dialog>).close()
                }
            })
        }

        buttons.push({
            text: this.submitMessage,
            classes: "fw-dark",
            click: () => this.submitForm()
        })

        buttons.push({
            type: "cancel" as const
        })

        const language = this.editor.view.state.doc.attrs.language as string
        const enabledCategories = this.getEnabledCategories()
        const availableLanguages = this.getAvailableLanguages()

        this.dialog = new Dialog({
            id: "code-block-dialog",
            title: gettext("Configure code block"),
            body: this.getDialogTemplate(
                language,
                enabledCategories,
                availableLanguages
            ),
            buttons,
            onClose: () => this.editor.currentView.focus()
        })

        this.dialog.open()

        // Language selector
        const languageSelector = dropdownSelect(
            this.dialog.dialogEl.querySelector(
                ".code-block-language"
            ) as HTMLSelectElement,
            {
                onChange: (newValue: string | false) => {
                    if (newValue !== false) {
                        this.language = newValue
                    }
                },
                width: "80%",
                value: this.language
            }
        )
        this.languageSelector = languageSelector

        // Category selector
        if (enabledCategories.length > 0) {
            const categorySelector = dropdownSelect(
                this.dialog.dialogEl.querySelector(
                    ".code-block-category"
                ) as HTMLSelectElement,
                {
                    onChange: (newValue: string | false) => {
                        if (newValue !== false) {
                            this.category = newValue
                        }
                    },
                    width: "80%",
                    value: this.category
                }
            )
            this.categorySelector = categorySelector
        }

        // Title input
        const titleInput =
            this.dialog.dialogEl.querySelector(".code-block-title")
        if (titleInput) {
            ;(titleInput as HTMLInputElement).value = this.title
            titleInput.addEventListener("input", () => {
                this.title = (titleInput as HTMLInputElement).value
            })
        }
    }

    getDialogTemplate(
        language: string,
        enabledCategories: string[],
        availableLanguages: string[]
    ): string {
        return `<table class="fw-dialog-table">
            <tbody>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Language")}</h4></th>
                    <td>
                        <select class="code-block-language">
                            <option value="">${gettext("None")}</option>
                            ${availableLanguages
                                .map(
                                    lang =>
                                        `<option value="${lang}">${lang}</option>`
                                )
                                .join("")}
                        </select>
                    </td>
                </tr>
                ${
                    enabledCategories.length > 0
                        ? `<tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Category")}</h4></th>
                    <td>
                        <select class="code-block-category">
                            <option value="">${gettext("None")}</option>
                            ${enabledCategories
                                .map(
                                    cat =>
                                        `<option value="${cat}">${(CATS as any)[cat]?.[language] || cat}</option>`
                                )
                                .join("")}
                        </select>
                    </td>
                </tr>`
                        : ""
                }
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Title")}</h4></th>
                    <td>
                        <input type="text" class="code-block-title" placeholder="${gettext("Optional title")}" style="width: 80%">
                    </td>
                </tr>
            </tbody>
        </table>`
    }
}
