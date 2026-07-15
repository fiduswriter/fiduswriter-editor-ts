import {fnSchema} from "@fiduswriter/document/schema/footnotes"
import {htmlToFnNode} from "@fiduswriter/document/schema/footnotes_convert"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import type {Node} from "prosemirror-model"
import type {Transaction} from "prosemirror-state"

import type {Editor} from "../../types.js"
import {trackedTransaction} from "../../track/index.js"

export class FootnoteView {
    node: Node
    outerView: EditorView
    getPos: () => number
    editor: Editor
    dom: HTMLElement
    innerView: EditorView | null
    updatedMainEditor: boolean

    constructor(
        node: Node,
        view: EditorView,
        getPos: () => number,
        editor: Editor
    ) {
        // We'll need these later
        this.node = node
        this.outerView = view
        this.getPos = getPos
        this.editor = editor

        // The node's representation in the editor (empty, for now)
        this.dom = document.createElement("div")
        this.dom.className = "footnote-view"
        // These are used when the footnote is selected
        this.innerView = null
        // Updated main editor state
        this.updatedMainEditor = false
    }

    selectNode(): void {
        this.dom.classList.add("ProseMirror-selectednode")
        if (!this.innerView) {
            this.open()
        }
    }

    deselectNode(): void {
        this.dom.classList.remove("ProseMirror-selectednode")
        if (this.innerView) {
            this.close()
        }
    }

    open(): void {
        // Append a tooltip to the outer node
        const tooltip = this.dom.appendChild(document.createElement("div"))
        tooltip.className = "footnote-tooltip"
        const diffMark = this.node.marks.find(
            mark => mark.type.name === "diffdata"
        )
        if (diffMark === undefined) {
            tooltip.classList.add("render-arrow")
        } else {
            tooltip.style.top = "-30px"
        }

        const doc = fnSchema.nodeFromJSON({
            type: "doc",
            content: [
                {
                    type: "footnotecontainer",
                    content: this.node.attrs.footnote
                }
            ]
        })

        // And put a sub-ProseMirror into that
        this.innerView = new EditorView(tooltip, {
            state: EditorState.create({
                doc: doc
            }),
            dispatchTransaction: this.dispatchInner.bind(this),
            handleDOMEvents: {
                mousedown: () => {
                    if (this.outerView.hasFocus()) {
                        this.innerView?.focus()
                    }
                }
            }
        })
    }

    close(): void {
        if (!this.updatedMainEditor && this.outerView) {
            this.updateMainEditor()
        }
        if (this.innerView) {
            this.innerView.destroy()
            this.innerView = null
            this.dom.textContent = ""
            this.updatedMainEditor = false
        }
    }

    updateMainEditor(): void {
        const outerTr = this.outerView.state.tr
        const footnoteContent = this.innerView?.state.doc
            .child(0)
            .toJSON().content
        const pos = this.getPos()
        const node = outerTr.doc.nodeAt(pos)
        if (node) {
            outerTr.setNodeMarkup(pos, node.type, {
                footnote: footnoteContent
            })
        }
        if (outerTr.docChanged) {
            outerTr.setMeta("fromFootnote", true)
            this.updatedMainEditor = true
            this.outerView.dispatch(outerTr)
        }
    }

    dispatchInner(tr: Transaction): void {
        const trackedTr = trackedTransaction(
            tr,
            this.innerView?.state as EditorState,
            this.editor.user,
            !this.outerView.state.doc.attrs.tracked &&
                !["write-tracked", "review-tracked"].includes(
                    this.editor.docInfo.access_rights as string
                ),
            Date.now() - this.editor.clientTimeAdjustment
        )
        const {state} = (this.innerView as EditorView).state.applyTransaction(
            trackedTr
        )
        ;(this.innerView as EditorView).updateState(state)
    }

    update(node: Node): boolean {
        this.node = node
        return true
    }

    destroy(): void {
        this.outerView = null as unknown as EditorView
        if (this.innerView) {
            this.close()
        }
    }

    stopEvent(event: Event): boolean {
        return this.innerView
            ? this.innerView.dom.contains(event.target as globalThis.Node)
            : false
    }

    ignoreMutation(): boolean {
        return true
    }
}

export const readOnlyFnEditor = (footnoteElement: HTMLElement): HTMLElement => {
    // This function creates a read only footnote editor for the purpose of showing the
    // footnote nodes which are drawn as part of deletion decoration.
    const newFnElement = document.createElement("div")
    newFnElement.className = "footnote-view"
    newFnElement.dataset.footnote = footnoteElement.dataset.footnote as string
    const tooltip = newFnElement.appendChild(document.createElement("div"))
    tooltip.className = "footnote-tooltip"
    tooltip.classList.add("render-arrow")
    tooltip.style.display = "none"

    // Parse Footnote node's data
    const doc = fnSchema.nodeFromJSON({
        type: "doc",
        content: [
            {
                type: "footnotecontainer",
                content: htmlToFnNode(footnoteElement.dataset.footnote as string)
            }
        ]
    })

    // Put a reado only sub-ProseMirror into that
    new EditorView(tooltip, {
        state: EditorState.create({
            doc: doc
        }),
        editable: () => false
    })

    return newFnElement
}
