import {DiffDOM} from "diff-dom"
import type {EditorView} from "prosemirror-view"

import type {Editor} from "../../types.js"

interface ToolbarBaseItem {
    available?: (editor: Editor) => boolean
    disabled?: (editor: Editor) => boolean
    order?: number
}

interface ToolbarButtonItem extends ToolbarBaseItem {
    type: "button"
    title: string
    icon: string | ((editor: Editor) => string)
    class?: (editor: Editor) => string
    selected?: (editor: Editor) => boolean
    action: (editor: Editor) => boolean | void
}

interface ToolbarInfoItem extends ToolbarBaseItem {
    type: "info"
    show: (editor: Editor) => string
}

interface ToolbarMenuOption extends ToolbarBaseItem {
    title: string
    action: (editor: Editor) => boolean | void
}

interface ToolbarMenuItem extends ToolbarBaseItem {
    type: "menu"
    title: string
    show: (editor: Editor) => string
    open: boolean
    content: ToolbarMenuOption[]
}

type ToolbarItem = ToolbarButtonItem | ToolbarInfoItem | ToolbarMenuItem

interface ToolbarModel {
    openMore: boolean
    content: ToolbarItem[]
}

export class ToolbarView {
    editorView: EditorView
    options: {editor: Editor}
    editor: Editor
    dd: DiffDOM
    sideMargins: number
    availableWidth: number
    openedMenu: number | false
    listeners: {
        onclick?: (event: MouseEvent) => void
        onmousedown?: (event: MouseEvent) => void
    }

    constructor(editorView: EditorView, options: {editor: Editor}) {
        this.editorView = editorView
        this.options = options

        this.editor = this.options.editor
        if (!this.editor.menu.toolbarViews) {
            this.editor.menu.toolbarViews = []
        }
        this.editor.menu.toolbarViews.push(this)

        this.dd = new DiffDOM({
            valueDiffing: false
        })
        this.sideMargins = 20 + 20
        this.availableWidth = window.innerWidth - this.sideMargins
        this.openedMenu = false
        this.listeners = {}

        if (editorView === this.options.editor.view) {
            this.removeUnavailable(this.options.editor.menu.toolbarModel as ToolbarModel)
        }

        this.bindEvents()
        this.update()
    }

    removeUnavailable(menu: ToolbarModel): void {
        menu.content = menu.content.filter(item => {
            if (item.available && !item.available(this.editor)) {
                return false
            } else if (item.type === "menu") {
                this.removeUnavailable(item as unknown as ToolbarModel)
            }
            return true
        })
    }

    bindEvents(): void {
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener("click", this.listeners.onclick)
        this.listeners.onmousedown = event => this.onmousedown(event)
        document.body.addEventListener("mousedown", this.listeners.onmousedown)
    }

    destroy(): void {
        document.body.removeEventListener("click", this.listeners.onclick!)
        document.body.removeEventListener(
            "mousedown",
            this.listeners.onmousedown!
        )
        this.editor.menu.toolbarViews = this.editor.menu.toolbarViews?.filter(
            view => view !== this
        )
    }

    onmousedown(event: MouseEvent): void {
        const target = event.target as HTMLElement | null
        if (
            target?.closest(".editor-toolbar") &&
            document.activeElement?.classList.contains("citation-inline-input")
        ) {
            event.preventDefault()
        }
    }

    onResize(): void {
        this.availableWidth = window.innerWidth - this.sideMargins
        this.update()
    }

    onclick(event: MouseEvent): void {
        if (this.editorView !== this.editor.currentView) {
            return
        }
        const target = event.target as HTMLElement | null
        if (!target) {
            return
        }
        const toolbarModel = this.editor.menu.toolbarModel as ToolbarModel
        if (
            target.matches(
                ".editor-toolbar .more-button li:not(.fw-disabled), .editor-toolbar .more-button li:not(.fw-disabled) *"
            )
        ) {
            let menuNumber = 0
            let seekItem: Element | null = target.closest("li")
            while (seekItem?.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            seekItem =
                seekItem?.parentElement?.parentElement?.parentElement?.parentElement ?? null
            while (seekItem?.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            const menuItem = toolbarModel.content[menuNumber]
            if (menuItem?.type === "menu") {
                menuItem.open = true
                this.openedMenu = menuNumber
                event.preventDefault()
                this.update()
            } else if (menuItem?.type === "button") {
                event.preventDefault()
                const focus = menuItem.action(this.editor)
                toolbarModel.openMore = false
                this.update()
                if (focus !== false) {
                    this.editor.currentView.focus()
                }
            }
        } else if (
            target.matches(
                ".editor-toolbar .more-button, .editor-toolbar .more-button *"
            )
        ) {
            toolbarModel.openMore = true
            if (this.openedMenu !== false) {
                const openedItem = toolbarModel.content[this.openedMenu]
                if (openedItem?.type === "menu") {
                    openedItem.open = false
                }
            }
            this.update()
        } else if (
            target.matches(
                ".editor-toolbar li:not(.fw-disabled), .editor-toolbar li:not(.fw-disabled) *"
            )
        ) {
            let itemNumber = 0
            let seekItem: Element | null = target.closest("li")
            while (seekItem?.previousElementSibling) {
                itemNumber++
                seekItem = seekItem.previousElementSibling
            }
            seekItem =
                seekItem?.parentElement?.parentElement?.parentElement?.parentElement ?? null
            let menuNumber = 0
            while (seekItem?.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            event.preventDefault()
            const menu = toolbarModel.content[menuNumber]
            if (menu?.type !== "menu") {
                return
            }
            const focus = menu.content[itemNumber].action(this.editor)
            menu.open = false
            this.openedMenu = false
            this.update()
            if (focus !== false) {
                this.editor.currentView.focus()
            }
        } else if (
            this.openedMenu !== false ||
            toolbarModel.openMore
        ) {
            if (this.openedMenu !== false) {
                const openedItem = toolbarModel.content[this.openedMenu]
                if (openedItem?.type === "menu") {
                    openedItem.open = false
                }
            }
            toolbarModel.openMore = false
            this.openedMenu = false
            this.update()
        } else if (
            target.matches(
                ".editor-toolbar > div:not(.fw-disabled), .editor-toolbar > div:not(.fw-disabled) *"
            )
        ) {
            let menuNumber = 0
            let seekItem: Element | null = target.closest("div.ui-buttonset")
            if (!seekItem) {
                return
            }
            while (seekItem?.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            const menuItem = toolbarModel.content[menuNumber]
            if (menuItem?.type === "menu") {
                menuItem.open = true
                this.openedMenu = menuNumber
                toolbarModel.openMore = false
                event.preventDefault()
                this.update()
            } else if (menuItem?.type === "button" && menuItem.action) {
                event.preventDefault()
                const focus = menuItem.action(this.editor)
                toolbarModel.openMore = false
                this.update()
                if (focus !== false) {
                    this.editor.currentView.focus()
                }
            }
        }
    }

    update(): void {
        if (this.editorView !== this.editor.currentView) {
            return
        }
        let spaceCounter = this.availableWidth
        let menuIndexToDrop: number | false = false
        const toolbarModel = this.editor.menu.toolbarModel as ToolbarModel
        toolbarModel.content.some((menuItem, index) => {
            switch (menuItem.type) {
                case "info":
                    spaceCounter -= 94
                    break
                case "menu":
                    spaceCounter -= 138
                    break
                default:
                    spaceCounter -= 52
            }
            if (spaceCounter < 0) {
                menuIndexToDrop = Math.max(index - 2, 3)
                return true
            }
            return false
        })
        const toolbarEl = (document.querySelector("#toolbar") || {})
            .firstElementChild as Element | undefined
        if (!toolbarEl) {
            return
        }
        const diff = this.dd.diff(
            toolbarEl,
            this.getToolbarHTML(menuIndexToDrop)
        )
        this.dd.apply(toolbarEl, diff)
    }

    getToolbarHTML(menuIndexToDrop: number | false): string {
        const toolbarModel = this.editor.menu.toolbarModel as ToolbarModel
        return `<div>
            <div class="editor-toolbar">
                ${toolbarModel.content
                    .map((menuItem, index) => {
                        if (!menuIndexToDrop || index < menuIndexToDrop) {
                            return `
                            <div class="ui-buttonset${menuItem.disabled?.(this.editor) ? " fw-disabled" : ""}">
                                ${this.getToolbarMenuItemHTML(menuItem, index)}
                            </div>
                        `
                        } else {
                            return ""
                        }
                    })
                    .join("")}
                ${this.getMoreButtonHTML(menuIndexToDrop)}
            </div>
        </div>`
    }

    getToolbarMenuItemHTML(menuItem: ToolbarItem, _index: number): string {
        let returnValue = ""
        switch (menuItem.type) {
            case "info":
                returnValue = this.getInfoHTML(menuItem)
                break
            case "menu":
                returnValue = this.getDropdownHTML(menuItem)
                break
            case "button":
                returnValue = this.getButtonHTML(menuItem)
                break
            default:
                returnValue = ""
                break
        }
        return returnValue
    }

    getMoreButtonHTML(menuIndexToDrop: number | false): string {
        if (menuIndexToDrop) {
            return `
                <div class="ui-buttonset more-button">
                    <div class="multi-buttons">
                        <span class="multi-buttons-cover fw-button fw-white fw-large edit-button">
                            ${gettext("More")}
                        </span>
                        ${this.getMoreButtonListHTML(menuIndexToDrop)}
                    </div>
                </div>
            `
        } else {
            return ""
        }
    }

    getMoreButtonListHTML(menuIndexToDrop: number): string {
        const toolbarModel = this.editor.menu.toolbarModel as ToolbarModel
        if (toolbarModel.openMore) {
            const remainingItems =
                toolbarModel.content.slice(menuIndexToDrop) as ToolbarMenuOption[]
            return `
                <div class="fw-pulldown fw-left" style="display: block;">
                    <ul>${remainingItems.map(menuOption => this.getDropdownOptionHTML(menuOption)).join("")}</ul>
                </div>
            `
        } else {
            return ""
        }
    }

    getInfoHTML(menuItem: ToolbarInfoItem): string {
        return `<div class="info">${menuItem.show(this.editor)}</div>`
    }

    getDropdownHTML(menuItem: ToolbarMenuItem): string {
        return `
        <div class="multi-buttons">
            <span class="multi-buttons-cover fw-button fw-white fw-large edit-button${menuItem.disabled?.(this.editor) ? " fw-disabled" : ""}">
                ${menuItem.show(this.editor)}
            </span>
            ${this.getDropdownListHTML(menuItem)}
        </div>
        `
    }

    getDropdownListHTML(menuItem: ToolbarMenuItem): string {
        if (menuItem.open) {
            return `<div class="fw-pulldown fw-left" style="display: block;"><ul>${menuItem.content.map(menuOption => this.getDropdownOptionHTML(menuOption)).join("")}</ul></div>`
        } else {
            return ""
        }
    }

    getDropdownOptionHTML(menuOption: ToolbarMenuOption): string {
        return `
        <li class="fw-dialog-titlebar-button ui-widget ui-state-default ui-corner-all ui-button-text-only${menuOption.disabled?.(this.editor) ? " fw-disabled" : ""}" role="button" aria-disabled="false">
            <span class="ui-button-text">
                <input type="radio" >
                <label class="fw-pulldown-item">${menuOption.title}</label>
            </span>
        </li>
        `
    }

    getButtonHTML(menuItem: ToolbarButtonItem): string {
        return `
        <button aria-label="${menuItem.title}" class="fw-button fw-white fw-large fw-square edit-button${menuItem.disabled?.(this.editor) ? " fw-disabled" : ""}${menuItem.selected?.(this.editor) ? " fw-state-active" : ""}${menuItem.class ? ` ${menuItem.class(this.editor)}` : ""}" title="${menuItem.title}" >
            <span class="ui-button-text">
                <i class="fa-solid fa-${typeof menuItem.icon === "function" ? menuItem.icon(this.editor) : menuItem.icon}"></i>
            </span>
        </button>`
    }
}
