import {Dialog, dropdownSelect} from "fwtoolkit"
import type {Node} from "prosemirror-model"
import type {EditorState} from "prosemirror-state"

import {tableConfigurationTemplate, tableInsertTemplate} from "./templates.js"
import type {Editor} from "../types.js"

export class TableDialog {
    editor: Editor
    dialog: InstanceType<typeof Dialog> | false

    constructor(editor: Editor) {
        this.editor = editor
        this.dialog = false
    }

    init(): void {
        this.insertTableDialog()
    }

    markInsertTable(cell: HTMLTableCellElement, className: string): {
        colCount: number
        rowCount: number
    } {
        ;(this.dialog as InstanceType<typeof Dialog>).dialogEl
            .querySelectorAll(`td.${className}`)
            .forEach(el => el.classList.remove(className))
        let colCount = 1
        let countElement: Element | null = cell
        while (countElement.previousElementSibling) {
            countElement = countElement.previousElementSibling
            colCount += 1
        }
        let rowCount = 1
        countElement = (countElement as HTMLTableCellElement).parentElement
        while (countElement?.previousElementSibling) {
            countElement = countElement.previousElementSibling
            rowCount += 1
        }
        // add hover class.
        const rows = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelectorAll(
            "tr"
        )
        for (let i = 0; i < rowCount; i++) {
            const cols = rows[i].querySelectorAll("td")
            for (let j = 0; j < colCount; j++) {
                cols[j].classList.add(className)
            }
        }
        return {colCount, rowCount}
    }

    insertTableDialog(): void {
        let rowCount = 1,
            colCount = 1
        const buttons: any[] = []
        buttons.push({
            text: gettext("Insert"),
            classes: "fw-dark",
            click: () => {
                const table = {
                    type: "table",
                    content: [
                        {type: "table_caption"},
                        {type: "table_body", content: []}
                    ]
                } as {
                    type: string
                    content: Array<{type: string; content?: any[]}>
                }
                const table_body = table.content[1] as {
                    type: string
                    content: any[]
                }

                for (let i = 0; i < rowCount; i++) {
                    const row = {type: "table_row", content: []}
                    for (let j = 0; j < colCount; j++) {
                        ;(row.content as any[]).push({
                            type: "table_cell",
                            content: [{type: "paragraph"}]
                        })
                    }
                    table_body.content.push(row)
                }
                const schema = this.editor.currentView.state.schema
                this.editor.currentView.dispatch(
                    this.editor.currentView.state.tr.replaceSelectionWith(
                        schema.nodeFromJSON(table),
                        false
                    )
                )
                ;(this.dialog as InstanceType<typeof Dialog>).close()
            }
        })
        buttons.push({
            type: "cancel" as const
        })

        this.dialog = new Dialog({
            title: gettext("Insert table"),
            body: tableInsertTemplate(),
            width: 360,
            height: 360,
            buttons,
            onClose: () => this.editor.currentView.focus(),
            restoreActiveElement: false
        })

        this.dialog.open()

        // manage hovering over table cells
        this.dialog.dialogEl.querySelectorAll("td").forEach(el =>
            el.addEventListener("mouseenter", () => {
                this.markInsertTable(el as HTMLTableCellElement, "hover")
            })
        )
        this.dialog.dialogEl.querySelectorAll("td").forEach(el =>
            el.addEventListener("mouseleave", () => {
                ;(this.dialog as InstanceType<typeof Dialog>).dialogEl
                    .querySelectorAll("td.hover")
                    .forEach(mEl => mEl.classList.remove("hover"))
            })
        )

        this.dialog.dialogEl.querySelectorAll("td").forEach(el =>
            el.addEventListener("click", event => {
                event.preventDefault()
                event.stopImmediatePropagation()
                const newCounts = this.markInsertTable(
                    el as HTMLTableCellElement,
                    "selected"
                )
                rowCount = newCounts.rowCount
                colCount = newCounts.colCount
            })
        )
    }
}

export class TableConfigurationDialog {
    editor: Editor
    dialog: InstanceType<typeof Dialog> | false
    aligned: string
    width: string
    layout: string
    category: string
    caption: boolean

    constructor(editor: Editor) {
        this.editor = editor
        this.dialog = false
        this.aligned = "center"
        this.width = "100"
        this.layout = "fixed"
        this.category = "none"
        this.caption = false
    }

    init(): void {
        const {table} = this.findTable(this.editor.currentView.state)
        if (!table) {
            return
        }
        this.width = table.attrs.width
        this.aligned = table.attrs.aligned
        this.layout = table.attrs.layout
        this.category = table.attrs.category
        this.caption = table.attrs.caption
        this.insertDialog()
    }

    findTable(state: EditorState): {table: Node | false; tablePos?: number} {
        const $head = state.selection.$head
        for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type.name == "table") {
                return {table: $head.node(d), tablePos: $head.before(d)}
            }
        }
        return {table: false}
    }

    submitForm(): void {
        const {table, tablePos} = this.findTable(
            this.editor.currentView.state
        )
        if (!table) {
            return
        }
        const attrs = Object.assign({}, table.attrs, {
            width: this.width,
            aligned: this.width === "100" ? "center" : this.aligned,
            layout: this.layout,
            category: this.category,
            caption: this.caption
        })
        this.editor.currentView.dispatch(
            this.editor.currentView.state.tr.setNodeMarkup(
                tablePos as number,
                null,
                attrs
            )
        )
    }

    insertDialog(): void {
        const buttons: any[] = []
        buttons.push({
            text: gettext("Update"),
            classes: "fw-dark",
            click: () => {
                this.submitForm()
                ;(this.dialog as InstanceType<typeof Dialog>).close()
            }
        })
        buttons.push({
            type: "cancel" as const
        })

        this.dialog = new Dialog({
            title: gettext("Configure table"),
            body: tableConfigurationTemplate({
                language: this.editor.view.state.doc.attrs.language as string
            }),
            width: 400,
            height: 360,
            buttons,
            onClose: () => this.editor.currentView.focus()
        })

        this.dialog.open()

        const alignmentSelector = dropdownSelect(
            this.dialog.dialogEl.querySelector(
                ".table-alignment"
            ) as HTMLSelectElement,
            {
                onChange: (newValue: string | false) => {
                    if (newValue !== false) {
                        this.aligned = newValue
                    }
                },
                width: "80%",
                value: this.aligned
            }
        ) as {
            setValue: (value: string) => void
            disable: () => void
            enable: () => void
        }

        if (this.width == "100") {
            alignmentSelector.setValue("center")
            alignmentSelector.disable()
            this.aligned = "center"
        }

        dropdownSelect(
            this.dialog.dialogEl.querySelector(".table-width") as HTMLSelectElement,
            {
                onChange: (newValue: string | false) => {
                    if (newValue !== false) {
                        this.width = newValue
                        if (this.width == "100") {
                            alignmentSelector.setValue("center")
                            alignmentSelector.disable()
                            this.aligned = "center"
                        } else {
                            alignmentSelector.enable()
                        }
                    }
                },
                width: "80%",
                value: this.width
            }
        )

        dropdownSelect(
            this.dialog.dialogEl.querySelector(".table-layout") as HTMLSelectElement,
            {
                onChange: (newValue: string | false) => {
                    if (newValue !== false) {
                        this.layout = newValue
                    }
                },
                width: "80%",
                value: this.layout
            }
        )

        dropdownSelect(
            this.dialog.dialogEl.querySelector(".table-category") as HTMLSelectElement,
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

        dropdownSelect(
            this.dialog.dialogEl.querySelector(".table-caption") as HTMLSelectElement,
            {
                onChange: (newValue: string | false) => {
                    if (newValue !== false) {
                        this.caption = newValue === "true"
                    }
                },
                width: "80%",
                value: String(this.caption)
            }
        )
    }
}
