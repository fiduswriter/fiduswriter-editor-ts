import {ContentMenu} from "fwtoolkit"
import type {ContentMenuInit} from "fwtoolkit/content_menu"
import {Plugin, PluginKey, Selection} from "prosemirror-state"
import type {Node} from "prosemirror-model"
import type {EditorState} from "prosemirror-state"
import type {EditorView, NodeView} from "prosemirror-view"
import {WRITE_ROLES} from "..//index.js"
import type {Editor} from "../types.js"

const key = new PluginKey("table")

class TableView implements NodeView {
    node: Node
    view: EditorView
    getPos: () => number
    options: {editor: Editor}
    dom: HTMLElement
    contentDOM: HTMLTableElement
    menuButton: HTMLButtonElement

    constructor(
        node: Node,
        view: EditorView,
        getPos: () => number,
        options: {editor: Editor}
    ) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options
        this.dom = document.createElement("div")
        this.dom.classList.add(
            `table-${node.attrs.width}`,
            `table-${node.attrs.aligned}`,
            "content-container"
        )
        this.dom.id = node.attrs.id as string
        this.menuButton = document.createElement("button")
        this.menuButton.classList.add("fw-content-menu-btn")
        this.menuButton.innerHTML =
            '<span class="dot-menu-icon"><i class="fa-solid fa-ellipsis-v"></i></span>'
        this.dom.appendChild(this.menuButton)
        const dom = document.createElement("table")
        if ((node.attrs.track as unknown[])?.length) {
            dom.dataset.track = JSON.stringify(node.attrs.track)
        }
        dom.id = node.attrs.id as string
        dom.dataset.width = node.attrs.width as string
        dom.dataset.aligned = node.attrs.aligned as string
        dom.dataset.layout = node.attrs.layout as string
        ;(dom as unknown as {class: string}).class = `table-${node.attrs.width} table-${node.attrs.aligned} table-${node.attrs.layout}`
        dom.dataset.category = node.attrs.category as string
        if (!node.attrs.caption) {
            dom.dataset.captionHidden = "true"
        }
        this.contentDOM = dom
        this.dom.appendChild(this.contentDOM)
    }

    stopEvent(event: Event) {
        let stopped = false
        if (
            event.type === "mousedown" &&
            event.composedPath().includes(this.menuButton)
        ) {
            stopped = true
            const mouseEvent = event as MouseEvent
            if (!isSelectedTableClicked(this.view.state, this.getPos())) {
                const tr = this.view.state.tr
                const $pos = this.view.state.doc.resolve(this.getPos())
                const selection = Selection.findFrom($pos, 1, true)
                if (!selection) {
                    return stopped
                }
                tr.setSelection(selection)
                this.view.dispatch(tr)
            }
            const contentMenu = new ContentMenu({
                menu: this.options.editor.menu.tableMenuModel as ContentMenuInit,
                width: 280,
                page: this.options.editor,
                menuPos: {
                    X: Number.parseInt(mouseEvent.pageX as unknown as string) + 20,
                    Y: Number.parseInt(mouseEvent.pageY as unknown as string) - 100
                },
                onClose: () => {
                    this.view.focus()
                }
            })
            contentMenu.open()
        }
        return stopped
    }
}

class TableCaptionView implements NodeView {
    node: Node
    view: EditorView
    getPos: () => number
    options: {editor: Editor}
    dom: HTMLElement
    contentDOM: HTMLElement

    constructor(
        node: Node,
        view: EditorView,
        getPos: () => number,
        options: {editor: Editor}
    ) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options

        this.dom = document.createElement("caption")
        this.dom.innerHTML = '<span class="text"></span>'
        this.contentDOM = this.dom.lastElementChild as HTMLElement
    }
}

const isSelectedTableClicked = (state: EditorState, pos: number) => {
    const pathArr = (state.selection.$head as unknown as {path: (Node | number)[]}).path
    for (let i = 0; i < pathArr.length; i++) {
        const item = pathArr[i]
        if (
            typeof item !== "number" &&
            "type" in item &&
            item.type.name === "table" &&
            pathArr[i - 1] === pos
        ) {
            return true
        }
    }
    return false
}

export const tablePlugin = (options: {editor: Editor}) =>
    new Plugin({
        key,
        state: {
            init(_config, _state) {
                const self = this as unknown as {
                    spec: {props: {nodeViews: Record<string, unknown>}}
                }
                if (
                    WRITE_ROLES.includes(options.editor.docInfo.access_rights!)
                ) {
                    self.spec.props.nodeViews["table"] = (
                        node: Node,
                        view: EditorView,
                        getPos: () => number
                    ) => new TableView(node, view, getPos, options)
                }
                self.spec.props.nodeViews["table_caption"] = (
                    node: Node,
                    view: EditorView,
                    getPos: () => number
                ) => new TableCaptionView(node, view, getPos, options)

                return {}
            },
            apply(_tr, prev) {
                return prev
            }
        },
        props: {
            nodeViews: {}
        }
    })
