import {ContentMenu} from "fwtoolkit"
import type {ContentMenuInit} from "fwtoolkit/content_menu"
import {Plugin, PluginKey, Selection} from "prosemirror-state"
import type {Node} from "prosemirror-model"
import type {EditorView, NodeView} from "prosemirror-view"
import {WRITE_ROLES} from "..//index.js"
import type {Editor} from "../types.js"

const key = new PluginKey("tableMenu")

class OrderedListView implements NodeView {
    node: Node
    view: EditorView
    getPos: () => number
    options: {editor: Editor}
    dom: HTMLElement
    contentDOM: HTMLOListElement
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
        this.dom.classList.add("content-container")
        this.dom.id = node.attrs.id as string
        this.menuButton = document.createElement("button")
        this.menuButton.classList.add("fw-content-menu-btn")
        this.menuButton.innerHTML =
            '<span class="dot-menu-icon"><i class="fa-solid fa-ellipsis-v"></i></span>'
        this.dom.appendChild(this.menuButton)
        const orderedList = document.createElement("ol")
        if ((node.attrs.order as number) !== 1) {
            orderedList.start = node.attrs.order as number
        }
        if ((node.attrs.track as unknown[])?.length) {
            orderedList.dataset.track = JSON.stringify(node.attrs.track)
        }
        this.contentDOM = this.dom.appendChild(orderedList)
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
            const tr = this.view.state.tr
            const $pos = this.view.state.doc.resolve(this.getPos())
            const selection = Selection.findFrom($pos, 1, true)
            if (!selection) {
                return stopped
            }
            tr.setSelection(selection)
            this.view.dispatch(tr)
            const contentMenu = new ContentMenu({
                menu: this.options.editor.menu
                    .orderedListMenuModel as ContentMenuInit,
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

export const orderedListMenuPlugin = (options: {editor: Editor}) =>
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
                    self.spec.props.nodeViews["ordered_list"] = (
                        node: Node,
                        view: EditorView,
                        getPos: () => number
                    ) => new OrderedListView(node, view, getPos, options)
                }
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
