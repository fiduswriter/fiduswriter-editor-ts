import type {Node as ProseMirrorNode} from "prosemirror-model"
import type {NodeSelection} from "prosemirror-state"
import {
    Dialog,
    SelectionDataTable,
    addAlert,
    ensureCSS,
    escapeText,
    findTarget,
    setCheckableLabel
} from "fwtoolkit"

import type {Editor} from "../types.js"
import {plugins as defaultCitationPlugins} from "../plugins/citation_dialog/index.js"
import {
    dateToYear,
    litToText,
    nameToText
} from "@fiduswriter/bibliography-manager/tools"

import {configureCitationTemplate, selectedCitationTemplate} from "./templates.js"

ensureCSS(staticUrl("css/checkable_list.css"))

interface CitationReference {
    id: number
    prefix?: string
    locator?: string
}

interface CitationPlugin {
    init?(): Promise<void> | void
    [key: string]: any
}

export class CitationDialog {
    editor: Editor
    initialReferences: CitationReference[]
    initialFormat: string
    node: ProseMirrorNode | null
    dialog: InstanceType<typeof Dialog> | false
    buttons: any[]
    submitButtonText: string
    plugins: Record<string, CitationPlugin> | undefined
    selectionTable: any
    table: any
    lastSort: {column: number; dir: "asc" | "desc"}

    constructor(editor: Editor) {
        this.editor = editor
        this.initialReferences = []
        this.initialFormat = "autocite"
        this.node = (this.editor.currentView.state.selection as NodeSelection)
            .node
        this.dialog = false
        this.buttons = []
        this.submitButtonText = gettext("Insert")
        this.lastSort = {column: 0, dir: "asc"}
    }

    init(): void {
        this.activatePlugins()
        if (this.node?.type && this.node?.type.name === "citation") {
            this.initialFormat = this.node.attrs.format
            this.initialReferences = this.node.attrs.references
        }

        this.buttons.push({
            text: gettext("Register new source"),
            click: () => this.registerNewSource(),
            classes: "fw-light fw-add-button register-new-bib-source"
        })

        if (this.node?.type && this.node?.type.name === "citation") {
            this.buttons.push({
                text: gettext("Remove"),
                click: () => {
                    const transaction =
                        this.editor.currentView.state.tr.deleteSelection()
                    this.editor.currentView.dispatch(transaction)
                    ;(this.dialog as InstanceType<typeof Dialog>).close()
                },
                classes: "fw-orange"
            })
            this.submitButtonText = gettext("Update")
        }

        this.buttons.push({
            text: this.submitButtonText,
            click: () => {
                if (this.dialogSubmit()) {
                    ;(this.dialog as InstanceType<typeof Dialog>).close()
                }
            },
            classes: "fw-dark insert-citation"
        })

        this.buttons.push({
            type: "cancel"
        })

        this.dialog = new Dialog({
            id: "configure-citation",
            title: gettext("Configure Citation"),
            buttons: this.buttons,
            body: this.citationDialogHTML(),
            width: 1004,
            onClose: () => this.editor.currentView.focus(),
            restoreActiveElement: false
        })
        this.dialog.open()
        this.initTable()
        this.bind()
    }

    activatePlugins(): Promise<void> {
        if (this.plugins) {
            // Plugins have been activated already
            return Promise.resolve()
        }
        // Add plugins. Prefer plugins injected by the host app; fall back to
        // the default plugin list bundled with the editor package.
        const pluginList =
            (this.editor.citationDialogPlugins as any[]) || defaultCitationPlugins
        this.plugins = {}

        return Promise.all(
            pluginList.map(([app, plugin]: [string, Record<string, any>]) => {
                if (!this.editor.app.settings.APPS.includes(app)) {
                    return Promise.resolve()
                }
                return Promise.all(
                    Object.values(plugin).map(pluginExport => {
                        if (typeof pluginExport === "function") {
                            ;(this.plugins as Record<string, CitationPlugin>)[
                                pluginExport.name
                            ] = new pluginExport(this)
                            return (
                                (
                                    this.plugins as Record<string, CitationPlugin>
                                )[pluginExport.name].init!() || Promise.resolve()
                            )
                        }
                        return Promise.resolve()
                    })
                )
            })
        ).then(() => undefined)
    }

    createAllTableRows(): (string | number)[][] {
        const data: (string | number)[][] = []
        // unify bibs from both document and user
        Object.keys((this.editor.mod.db as any).bibDB.db).forEach(id => {
            data.push(
                this.createTableRow(
                    (this.editor.mod.db as any).bibDB.db[id],
                    Number.parseInt(id),
                    "document"
                )
            )
        })
        Object.keys((this.editor.app as any).bibDB.db).forEach(id => {
            const bib = (this.editor.app as any).bibDB.db[id]
            if (!(this.editor.mod.db as any).bibDB.hasReference(bib)) {
                data.push(this.createTableRow(bib, Number.parseInt(id), "user"))
            }
        })
        return data
    }

    createTableRow(bib: any, id: number, db: string): (string | number)[] {
        const bibauthors = bib.fields.author || bib.fields.editor
        return [
            `${db}-${id}`,
            `<span class="fw-data-table-title fw-inline">
                <i class="fa-solid fa-book"></i>
                <span class="fw-searchable">${bib.fields.title?.length ? escapeText(litToText(bib.fields.title)) : gettext("Untitled")}</span>
            </span>`,
            bibauthors ? escapeText(nameToText(bibauthors)) : "",
            bib.fields.date ? dateToYear(bib.fields.date) : ""
        ]
    }

    citationDialogHTML(): string {
        // Assemble the HTML of the 'cited' column of the dialog,
        // and return the templated dialog HTML.
        const citedItemsHTML = this.initialReferences
            .map(citEntry => {
                const id = citEntry.id
                if (!(this.editor.mod.db as any).bibDB.db[id]) {
                    return ""
                }
                const bibEntry = this.bibDBToBibEntry(
                    (this.editor.mod.db as any).bibDB.db[id],
                    id,
                    "document"
                )
                bibEntry.prefix = citEntry.prefix ? citEntry.prefix : ""
                bibEntry.locator = citEntry.locator ? citEntry.locator : ""
                return selectedCitationTemplate(bibEntry)
            })
            .join("")

        return configureCitationTemplate({
            citedItemsHTML,
            citeFormat: this.initialFormat
        })
    }

    registerNewSource(): void {
        import("@fiduswriter/bibliography-manager/form").then(({BibEntryForm}) => {
            const form = new BibEntryForm((this.editor.mod.db as any).bibDB)
            form.init().then((idTranslations: [number, number][]) => {
                const ids = idTranslations.map(idTrans => idTrans[1])
                this.addToCitableItems(ids)
            })
        })
    }

    bibDBToBibEntry(
        bib: any,
        id: number | string,
        db: string
    ): {
        id: number | string
        db: string
        bib_type: string
        title: string
        author: string
        year: string
        prefix: string
        locator: string
    } {
        const bibauthors = bib.fields.author || bib.fields.editor
        return {
            id,
            db,
            bib_type: bib.bib_type,
            title: bib.fields.title?.length
                ? litToText(bib.fields.title)
                : gettext("Untitled"),
            author: bibauthors ? nameToText(bibauthors) : "",
            year: bib.fields.date ? dateToYear(bib.fields.date) : "",
            prefix: "",
            locator: ""
        }
    }

    // Update the citation dialog with new items in 'citable' column.
    // Not when dialog is first opened.
    addToCitableItems(ids: number[]): void {
        const data: (string | number)[][] = []
        ids.forEach(id => {
            const citeItemData = this.bibDBToBibEntry(
                (this.editor.mod.db as any).bibDB.db[id],
                id,
                "document"
            )
            this.addToCitedItems([citeItemData])
            data.push(
                this.createTableRow(
                    (this.editor.mod.db as any).bibDB.db[id],
                    id,
                    "document"
                )
            )
        })

        this.table.insert({data})
        this.table.columns.sort(this.lastSort.column, this.lastSort.dir)
    }

    // Update the citation dialog with new items in 'cited' column.
    // Not when dialog is first opened.
    addToCitedItems(
        items: Array<{
            id: number | string
            db: string
            title: string
            author: string
            year: string
        }>
    ): void {
        const len = items.length
        for (let i = 0; i < len; i++) {
            const item = items[i]
            ;(this.dialog as InstanceType<typeof Dialog>).dialogEl
                .querySelector(
                    "#selected-cite-source-table .fw-data-table-body"
                )
                ?.insertAdjacentHTML(
                    "beforeend",
                    selectedCitationTemplate({
                        id: item.id,
                        db: item.db,
                        title: item.title,
                        author: item.author,
                        year: item.year,
                        locator: "",
                        prefix: ""
                    })
                )
        }
    }

    initTable(): void {
        const host = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
            "#my-sources"
        ) as HTMLElement | null
        if (!host) {
            return
        }
        host.innerHTML = ""

        this.selectionTable = new SelectionDataTable({
            dom: host,
            classes: ["fw-data-table", "fw-large"],
            columns: [
                {
                    select: [0, 2, 3],
                    type: "string"
                },
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: 4,
                    sortable: false
                }
            ],
            data: this.createAllTableRows(),
            idColumn: 0,
            multiple: true,
            scrollY: "225px",
            labels: {
                noRows: gettext("No sources registered"),
                noResults: gettext("No results found"),
                placeholder: gettext("Search...")
            }
        })
        this.selectionTable.init()
        this.table = this.selectionTable.table

        this.table.on("datatable.sort", (column: number, dir: "asc" | "desc") => {
            this.lastSort = {column, dir}
        })
        this.table.columns.sort(0, "asc")
    }

    bind(): void {
        ;(this.dialog as InstanceType<typeof Dialog>).dialogEl
            .querySelector("#add-cite-source")
            ?.addEventListener("click", () => {
                const selectedIds = this.selectionTable.getSelected()
                const selectedItems: Array<{
                    id: number
                    db: string
                    title: string
                    author: string
                    year: string
                }> = []

                this.table.data.data.forEach((row: any) => {
                    const cell = row.cells[0]
                    const rowId = cell.text ?? cell.data
                    if (!selectedIds.includes(rowId)) {
                        return
                    }
                    const [db, id] = String(rowId)
                        .split("-")
                        .map((val, index) =>
                            index ? Number.parseInt(val) : val
                        ) as [string, number]
                    if (
                        (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                            `#selected-source-${db}-${id}`
                        )
                    ) {
                        return
                    }
                    selectedItems.push({
                        id,
                        db,
                        title: row.cells[1].text,
                        author: row.cells[2].data,
                        year: row.cells[3].data
                    })
                })
                this.addToCitedItems(selectedItems)
                this.selectionTable.deselectAll()
            })

        ;(this.dialog as InstanceType<typeof Dialog>).dialogEl.addEventListener(
            "click",
            event => {
                const el: {target?: HTMLElement} = {}
                let documentEl
                switch (true) {
                    case findTarget(event, ".selected-source .delete", el):
                        documentEl = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                            `#selected-source-${(el.target as HTMLElement).dataset.db}-${(el.target as HTMLElement).dataset.id}`
                        )
                        if (documentEl) {
                            documentEl.parentElement?.removeChild(documentEl)
                        }
                        break
                    case findTarget(event, ".selected-source .order-up", el):
                        documentEl = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                            `#selected-source-${(el.target as HTMLElement).dataset.db}-${(el.target as HTMLElement).dataset.id}`
                        )
                        if (
                            documentEl &&
                            documentEl.previousElementSibling
                        ) {
                            documentEl.parentElement?.insertBefore(
                                documentEl,
                                documentEl.previousElementSibling
                            )
                        }
                        break
                    case findTarget(event, ".selected-source .order-down", el):
                        documentEl = (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                            `#selected-source-${(el.target as HTMLElement).dataset.db}-${(el.target as HTMLElement).dataset.id}`
                        )
                        if (documentEl && documentEl.nextElementSibling) {
                            documentEl.parentElement?.insertBefore(
                                documentEl,
                                documentEl.nextElementSibling.nextElementSibling
                            )
                        }
                        break
                    case findTarget(event, ".fw-checkable", el):
                        setCheckableLabel(el.target as HTMLElement)
                        break
                    default:
                        break
                }
            }
        )
    }

    dialogSubmit(): boolean {
        const citeItems = Array.from(
                (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelectorAll(
                    "#selected-cite-source-table .fw-cite-parts-table"
                )
            ),
            references = citeItems.map(bibRef => {
                const deleteButton = bibRef.querySelector(".delete") as HTMLElement
                const db = deleteButton.dataset.db as string
                let id = Number.parseInt(deleteButton.dataset.id as string)
                if (db === "user") {
                    // entry is from user's bibDB. We need to import it into the
                    // document's bibDB.
                    const bib = (this.editor.app as any).bibDB.db[id]
                    id = (this.editor.mod.db as any).bibDB.addReference(bib, id)
                }
                const returnObj: CitationReference = {
                    id
                }
                const prefix = (
                    bibRef.querySelector(".fw-cite-text") as HTMLInputElement
                ).value
                if (prefix.length) {
                    returnObj["prefix"] = prefix
                }
                const locator = (
                    bibRef.querySelector(".fw-cite-page") as HTMLInputElement
                ).value
                if (locator.length) {
                    returnObj["locator"] = locator
                }
                return returnObj
            })

        if (!citeItems.length) {
            addAlert(
                "info",
                gettext("Please select at least one citation source!")
            )
            return false
        }

        const format = (
            (this.dialog as InstanceType<typeof Dialog>).dialogEl.querySelector(
                "#citation-style-selector"
            ) as HTMLSelectElement
        ).value

        if (
            JSON.stringify(references) ===
                JSON.stringify(this.initialReferences) &&
            format == this.initialFormat
        ) {
            // Nothing has been changed, so we just close the dialog again
            return true
        }

        const citationNode = this.editor.currentView.state.schema.nodes[
            "citation"
        ].create({format, references})
        const transaction =
            this.editor.currentView.state.tr.replaceSelectionWith(
                citationNode,
                true
            )
        this.editor.currentView.dispatch(transaction)
        return true
    }
}
