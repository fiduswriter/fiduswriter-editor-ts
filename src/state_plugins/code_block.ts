import {ContentMenu} from "fwtoolkit"
import type {ContentMenuInit} from "fwtoolkit/content_menu"
import {CATS} from "@fiduswriter/document/schema/i18n"
import {DOMSerializer, type Node} from "prosemirror-model"
import {NodeSelection, Plugin, PluginKey} from "prosemirror-state"
import type {EditorView, NodeView} from "prosemirror-view"
import type {Editor} from "../types.js"

const key = new PluginKey("codeBlockMenu")

interface CodeBlockOptions {
    editor: Editor
}

class CodeBlockView implements NodeView {
    node: Node
    view: EditorView
    getPos: () => number
    options: CodeBlockOptions
    dom: HTMLElement
    serializer: DOMSerializer
    contentDOM: HTMLElement
    menuButton: HTMLButtonElement

    constructor(node: Node, view: EditorView, getPos: () => number, options: CodeBlockOptions) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options
        this.dom = document.createElement("div")
        this.dom.classList.add("code-block-wrapper")

        // Add category label and title if present
        if (this.node.attrs.category || this.node.attrs.title) {
            this.addLabel()
        }

        // Use DOMSerializer to create the content
        this.serializer = DOMSerializer.fromSchema(node.type.schema)
        const preElement = this.serializer.serializeNode(this.node) as HTMLElement
        preElement.classList.forEach((className: string) =>
            this.dom.classList.add(className)
        )
        preElement.classList.value = ""
        this.dom.appendChild(preElement)

        // The contentDOM should be the <code> element inside <pre>
        this.contentDOM = preElement.querySelector("code") as HTMLElement

        // Add menu button
        this.menuButton = document.createElement("button")
        this.menuButton.classList.add("code-block-menu-btn")
        this.menuButton.innerHTML =
            '<span class="dot-menu-icon"><i class="fa-solid fa-ellipsis-v"></i></span>'
        this.dom.insertBefore(this.menuButton, this.dom.firstChild)

        // Add language badge if language is set
        if (this.node.attrs.language) {
            this.addLanguageBadge()
        }
    }

    addLabel() {
        const {category, title, id} = this.node.attrs as Record<string, string>
        const language = this.view.state.doc.attrs.language as string
        const categories: Record<string, number> = {}

        // Count code blocks by category
        this.view.state.doc.descendants(node => {
            if (
                (node.attrs.track as Array<{type: string}>)?.find(
                    track => track.type === "deletion"
                )
            ) {
                return true
            }
            if (
                node.type.name === "code_block" &&
                node.attrs.category &&
                node.attrs.id
            ) {
                if (!categories[node.attrs.category as string]) {
                    categories[node.attrs.category as string] = 0
                }
                categories[node.attrs.category as string]++

                if (node.attrs.id === id) {
                    // Found our position, stop counting
                    return false
                }
            }
            return
        })

        const label = document.createElement("div")
        label.classList.add("code-block-label")

        if (category && id) {
            label.dataset.id = id
            const categoryLabel =
                (CATS as Record<string, Record<string, string>>)[category]?.[
                    language
                ] || category
            const number = categories[category] || 1

            const labelText = title
                ? `${categoryLabel} ${number}: ${title}`
                : `${categoryLabel} ${number}`

            label.innerHTML = `<span class="label-text">${labelText}</span>`
        } else if (title) {
            // Title without category
            label.innerHTML = `<span class="label-text">${title}</span>`
        }

        this.dom.appendChild(label)
    }

    addLanguageBadge() {
        const badge = document.createElement("div")
        badge.classList.add("code-block-language-badge")
        badge.textContent = this.node.attrs.language as string
        this.dom.appendChild(badge)
    }

    stopEvent(event: Event) {
        let stopped = false
        if (event.type === "mousedown") {
            const mouseEvent = event as MouseEvent
            const composedPath = mouseEvent.composedPath()
            if (composedPath.includes(this.menuButton)) {
                stopped = true
                const tr = this.view.state.tr
                const $pos = this.view.state.doc.resolve(this.getPos())
                tr.setSelection(new NodeSelection($pos))
                this.view.dispatch(tr)
                const contentMenu = new ContentMenu({
                    menu: this.options.editor.menu
                        .codeBlockMenuModel as ContentMenuInit,
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
            } else if (
                composedPath.includes(this.dom) &&
                !composedPath.find(
                    el =>
                        el instanceof Element &&
                        el.matches &&
                        el.matches("code")
                )
            ) {
                stopped = true
                const tr = this.view.state.tr
                const $pos = this.view.state.doc.resolve(this.getPos())
                tr.setSelection(new NodeSelection($pos))
                this.view.dispatch(tr)
            }
        }

        return stopped
    }

    update(node: Node) {
        if (node.type !== this.node.type) {
            return false
        }

        const oldNode = this.node
        this.node = node

        // Update language badge if changed
        if (node.attrs.language !== oldNode.attrs.language) {
            const existingBadge = this.dom.querySelector(
                ".code-block-language-badge"
            )
            if (existingBadge) {
                existingBadge.remove()
            }
            if (node.attrs.language) {
                this.addLanguageBadge()
            }
        }

        // Update label if category, title, or id changed
        if (
            node.attrs.category !== oldNode.attrs.category ||
            node.attrs.title !== oldNode.attrs.title ||
            node.attrs.id !== oldNode.attrs.id
        ) {
            const existingLabel = this.dom.querySelector(".code-block-label")
            if (existingLabel) {
                existingLabel.remove()
            }
            if (node.attrs.category || node.attrs.title) {
                this.addLabel()
            }
        }

        return true
    }
}

export const codeBlockPlugin = (options: {editor: Editor}) =>
    new Plugin({
        key,
        state: {
            init(_config, _state) {
                const self = this as unknown as {
                    spec: {props: {nodeViews: Record<string, unknown>}}
                }
                if (options.editor.docInfo.access_rights === "write") {
                    self.spec.props.nodeViews["code_block"] = (
                        node: Node,
                        view: EditorView,
                        getPos: () => number
                    ) => new CodeBlockView(node, view, getPos, options)
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
