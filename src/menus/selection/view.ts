import {DiffDOM} from "diff-dom"
import type {EditorView} from "prosemirror-view"

import {READ_ONLY_ROLES} from "../../index.js"
import type {Editor} from "../../types.js"

interface MenuItem {
    type?: string
    title: string
    icon?: string | ((editor: Editor) => string)
    class?: (editor: Editor) => string
    hidden?: (editor: Editor) => boolean
    disabled?: (editor: Editor) => boolean
    selected?: (editor: Editor) => boolean
    available?: (editor: Editor) => boolean
    action?: (editor: Editor) => boolean | void
    open?: boolean
}

interface MenuModel {
    content: MenuItem[]
    openMore?: boolean
}

interface MenuWithViews {
    selectionMenuModel: MenuModel
    selectionMenuViews: SelectionMenuView[]
}

export class SelectionMenuView {
    editorView: EditorView
    options: {editor: Editor}
    editor: Editor
    dd: DiffDOM
    openedMenu: number | false
    listeners: {onclick?: (event: MouseEvent) => void}

    constructor(editorView: EditorView, options: {editor: Editor}) {
        this.editorView = editorView
        this.options = options

        this.editor = this.options.editor
        const menu = this.editor.menu as unknown as MenuWithViews
        if (!menu.selectionMenuViews) {
            menu.selectionMenuViews = []
        }
        menu.selectionMenuViews.push(this)

        this.dd = new DiffDOM({
            valueDiffing: false
        })
        this.openedMenu = false
        this.listeners = {}

        this.removeUnavailable(menu.selectionMenuModel)

        this.bindEvents()
        this.update()
    }

    getMenu(): MenuWithViews {
        return this.editor.menu as unknown as MenuWithViews
    }

    removeUnavailable(menu: MenuModel): void {
        // Remove those menu items from the menu model that are not available for this document.
        // Used for example for mark or element buttons that aren't permitted according to the
        // document template.
        menu.content = menu.content.filter(item => {
            if (item.available && !item.available(this.editor)) {
                return false
            } else if (item.type === "menu") {
                this.removeUnavailable(item as unknown as MenuModel)
            }
            return true
        })
    }

    bindEvents(): void {
        this.listeners.onclick = event => this.onclick(event)
        this.editor.dom.addEventListener("click", this.listeners.onclick as EventListener)
    }

    destroy(): void {
        this.editor.dom.removeEventListener(
            "click",
            this.listeners.onclick as EventListener
        )
        const menu = this.getMenu()
        menu.selectionMenuViews = menu.selectionMenuViews.filter(
            view => view !== this
        )
    }

    onclick(event: MouseEvent): void {
        if (this.editorView !== this.editor.currentView) {
            // the other editor must be active
            return
        }
        const target = event.target as HTMLElement
        if (
            target.matches(
                ".editor-selection-menu > div:not(.fw-disabled), .editor-selection-menu > div:not(.fw-disabled) *"
            )
        ) {
            // A menu item has been clicked, lets find out which one.
            let menuNumber = 0
            let seekItem = target.closest("div.ui-buttonset")
            while (seekItem?.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling as HTMLElement
            }
            const menuItem = this.getMenu().selectionMenuModel.content[menuNumber]
            // execute an associated action.
            if (menuItem.action) {
                event.preventDefault()
                const focus = menuItem.action(this.editor)
                this.update()
                if (focus !== false) {
                    this.editor.currentView.focus()
                }
            }
        } else if (
            this.openedMenu !== false ||
            this.getMenu().selectionMenuModel.openMore
        ) {
            if (this.openedMenu !== false) {
                this.getMenu().selectionMenuModel.content[
                    this.openedMenu
                ].open = false
            }
            this.getMenu().selectionMenuModel.openMore = false
            this.openedMenu = false
            this.update()
        }
    }

    update(): void {
        if (this.editorView !== this.editor.currentView) {
            // the other editor must be active
            return
        }
        const selectionMenuEl =
            document.querySelector("#selection-menu")?.firstElementChild
        if (!selectionMenuEl) {
            return
        }
        const diff = this.dd.diff(selectionMenuEl, this.getSelectionMenuHTML())
        this.dd.apply(selectionMenuEl, diff)
    }

    getSelectionMenuHTML(): string {
        if (
            READ_ONLY_ROLES.includes(this.editor.docInfo.access_rights as string) ||
            this.editorView.state.selection.empty ||
            (this.editor.mod.comments as {store: {commentDuringCreation?: boolean}}).store
                .commentDuringCreation ||
            (
                this.editor.mod.comments as {
                    interactions: {isCurrentlyEditing: () => boolean}
                }
            ).interactions.isCurrentlyEditing()
        ) {
            return "<div></div>"
        }
        const selectionMenuTop = (
                document.querySelector("#selection-menu") as HTMLElement
            ).getBoundingClientRect().top,
            offset =
                this.editorView.coordsAtPos(
                    this.editorView.state.selection.from
                ).top - selectionMenuTop
        return `<div style="margin-top: ${offset}px;">
            <div class="editor-selection-menu">
                ${this.getMenu().selectionMenuModel.content
                    .map(
                        (menuItem, index) =>
                            `<div class="ui-buttonset${(menuItem.hidden && menuItem.hidden(this.editor)) || (menuItem.disabled && menuItem.disabled(this.editor)) ? " fw-disabled" : ""}">
                        ${this.getSelectionMenuItemHTML(menuItem, index)}
                    </div>`
                    )
                    .join("")}
            </div>
        </div>`
    }

    getSelectionMenuItemHTML(menuItem: MenuItem, _index: number): string {
        if (menuItem.hidden?.(this.editor)) {
            return ""
        } else {
            return this.getButtonHTML(menuItem)
        }
    }

    getButtonHTML(menuItem: MenuItem): string {
        const icon =
            typeof menuItem.icon === "function"
                ? menuItem.icon(this.editor)
                : menuItem.icon
        return `
        <button aria-label="${menuItem.title}" class="fw-button fw-light fw-large fw-square edit-button${menuItem.selected && menuItem.selected(this.editor) ? " fw-state-active" : ""}${menuItem.class ? ` ${menuItem.class(this.editor)}` : ""}${menuItem.disabled && menuItem.disabled(this.editor) ? " fw-disabled" : ""}" title="${menuItem.title}" >
            <span class="ui-button-text">
                <i class="fa-solid fa-${icon}"></i>
            </span>
        </button>`
    }
}
