import {Fragment, Node as ProseMirrorNode} from "prosemirror-model"
import {Plugin, PluginKey} from "prosemirror-state"
import type {EditorState} from "prosemirror-state"
import type {EditorView, NodeView} from "prosemirror-view"

import type {Editor} from "../types.js"

const key = new PluginKey("documentTemplate")

interface DocumentTemplatePluginOptions {
    editor: Editor
}

interface ProtectedRange {
    from: number
    to: number
}

export function addDeletedPartWidget(
    dom: HTMLElement,
    view: EditorView,
    getPos: () => number | undefined
): void {
    dom.classList.add("doc-deleted")
    dom.insertAdjacentHTML(
        "beforeend",
        '<div class="remove-doc-part"><i class="fa-solid fa-trash-alt"></i></div>'
    )
    const removeButton = dom.lastElementChild as HTMLElement
    removeButton.addEventListener("click", () => {
        const pos = getPos()
        if (pos === undefined) {
            return
        }
        const from = pos,
            to = from + view.state.doc.nodeAt(from)!.nodeSize,
            tr = view.state.tr
        tr.delete(from, to)
        tr.setMeta("deleteUnusedSection", true)
        view.dispatch(tr)
    })
}

export function getProtectedRanges(state: EditorState): ProtectedRange[] {
    return (key.getState(state) as {protectedRanges: ProtectedRange[]})
        .protectedRanges
}

export function getAllowedElementsAndMarks(
    state: EditorState
): {elements: string[] | false; marks: string[] | false} {
    // Get the allowed elements and marks at the current selection position
    const {$anchor} = state.selection
    const docPart = $anchor.node(1) // Get the part node (richtext_part, heading_part, etc.)

    if (!docPart) {
        return {elements: false, marks: false}
    }

    const allowedElements = docPart.attrs.elements
        ? (docPart.attrs.elements as string[]).concat(
              "table_caption",
              "table_body",
              "table_row",
              "table_cell",
              "table_header",
              "list_item",
              "text"
          )
        : false

    const allowedMarks = docPart.attrs.marks
        ? (docPart.attrs.marks as string[]).concat(
              "insertion",
              "deletion",
              "comment",
              "anchor"
          )
        : false

    return {elements: allowedElements, marks: allowedMarks}
}

export function checkProtectedInSelection(state: EditorState): boolean {
    // Checks whether there is a protected range
    // within a selection
    const anchorDocPart = state.selection.$anchor.node(1),
        headDocPart = state.selection.$head.node(1)

    // If the protection is of header/start check if selection falls within the
    // protected range
    if (
        ["start", "header"].includes(anchorDocPart.attrs.locking) ||
        ["start", "header"].includes(headDocPart.attrs.locking)
    ) {
        const protectedRanges = getProtectedRanges(state),
            start = state.selection.from,
            end = state.selection.to
        if (
            protectedRanges.find(
                ({from, to}) =>
                    !(
                        (start <= from && end <= from) ||
                        (start >= to && end >= to)
                    )
            )
        ) {
            return true
        }
    }
    return (
        anchorDocPart.attrs.locking === "fixed" ||
        headDocPart.attrs.locking === "fixed"
    )
}

export class PartView implements NodeView {
    node: ProseMirrorNode
    view: EditorView
    getPos: () => number | undefined
    dom: HTMLElement
    contentDOM: HTMLElement

    constructor(
        node: ProseMirrorNode,
        view: EditorView,
        getPos: () => number | undefined
    ) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement("div")
        this.dom.classList.add("doc-part")
        this.dom.classList.add(`doc-${this.node.type.name}`)
        this.dom.classList.add(`doc-${this.node.attrs.id}`)
        if (node.attrs.hidden) {
            this.dom.dataset.hidden = "true"
        }
        if (node.attrs.deleted) {
            this.contentDOM = this.dom.appendChild(
                document.createElement("div")
            )
            addDeletedPartWidget(this.dom, view, getPos)
        } else {
            this.contentDOM = this.dom
        }
    }

    stopEvent(): boolean {
        return false
    }
}

export const documentTemplatePlugin = (
    options: DocumentTemplatePluginOptions
) =>
    new Plugin({
        key,
        state: {
            init(_config, state) {
                if (options.editor.docInfo.access_rights === "write") {
                    ;((this as any).spec.props as any).nodeViews[
                        "richtext_part"
                    ] = (
                        node: ProseMirrorNode,
                        view: EditorView,
                        getPos: () => number | undefined
                    ) => new PartView(node, view, getPos)
                    ;((this as any).spec.props as any).nodeViews[
                        "heading_part"
                    ] = (
                        node: ProseMirrorNode,
                        view: EditorView,
                        getPos: () => number | undefined
                    ) => new PartView(node, view, getPos)
                    ;((this as any).spec.props as any).nodeViews[
                        "table_part"
                    ] = (
                        node: ProseMirrorNode,
                        view: EditorView,
                        getPos: () => number | undefined
                    ) => new PartView(node, view, getPos)
                    // Tags and Contributors have node views defined in tag_input and contributor_input.
                    // TOCs have node views defined in toc_render.
                }

                const protectedRanges: ProtectedRange[] = [
                    {from: 0, to: 1} // article node
                ]
                state.doc.forEach((node, pos) => {
                    const from = pos
                    let to = from
                    if (node.attrs.locking === "fixed") {
                        to = from + node.nodeSize
                    } else if (node.attrs.locking === "header") {
                        // only relevant for tables
                        to =
                            from +
                            1 +
                            1 +
                            1 +
                            ((node.firstChild as ProseMirrorNode).firstChild
                                ?.nodeSize || 0) // + 1 for the part node + 1 for the table + 1 for the first row
                    } else if (node.attrs.locking === "start") {
                        let initialFragment = Fragment.fromJSON(
                            options.editor.schema,
                            node.attrs.initial
                        )
                        let protectionSize = initialFragment.size
                        if (
                            initialFragment.lastChild?.isTextblock
                        ) {
                            protectionSize -= 1 // We allow writing at the end of the last text block.
                            if (initialFragment.lastChild.nodeSize === 2) {
                                // The last text block is empty, so we remove all protection from it, even node type
                                protectionSize -= 1
                            }
                            initialFragment = initialFragment.cut(
                                0,
                                protectionSize
                            )
                        }
                        if (
                            node.content.size >= protectionSize &&
                            initialFragment.eq(
                                node.slice(0, protectionSize).content
                            )
                        ) {
                            // We only add protection if the start of the current content corresponds to the
                            // initial content. This may not be the case if the template has been changed.
                            to = from + 1 + protectionSize // + 1 for inside the part node
                        }
                    }
                    protectedRanges.push({from, to})
                })

                return {
                    protectedRanges
                }
            },
            apply(tr, _prev, oldState, _state) {
                let {protectedRanges} = key.getState(oldState) as {
                    protectedRanges: ProtectedRange[]
                }
                protectedRanges = protectedRanges.map(marker => ({
                    from: tr.mapping.map(marker.from, 1),
                    to: tr.mapping.map(marker.to, -1)
                }))
                return {
                    protectedRanges
                }
            }
        },
        props: {
            nodeViews: {}
        },
        filterTransaction: (tr, state) => {
            if (
                !tr.docChanged ||
                tr.getMeta("fixIds") ||
                tr.getMeta("remote") ||
                tr.getMeta("track") ||
                tr.getMeta("fromFootnote") ||
                tr.getMeta("deleteUnusedSection") ||
                tr.getMeta("settings") ||
                ["historyUndo", "historyRedo"].includes(tr.getMeta("inputType"))
            ) {
                return true
            }
            if (state.doc.childCount !== tr.doc.childCount) {
                return false
            }
            const {protectedRanges} = key.getState(state) as {
                protectedRanges: ProtectedRange[]
            }
            let allowed = true

            let changingRanges: Array<{start: number; end: number}> = []

            // We map all changes back to the document before changes have been applied.
            tr.steps
                .slice()
                .reverse()
                .forEach(step => {
                    const map = step.getMap()
                    if (changingRanges.length) {
                        const mapInv = map.invert()
                        changingRanges = changingRanges.map(range => ({
                            start: mapInv.map(range.start, -1),
                            end: mapInv.map(range.end, 1)
                        }))
                    }
                    const stepData = step as any
                    if (
                        ["removeMark", "addMark"].includes(stepData.jsonID)
                    ) {
                        changingRanges.push({
                            start: stepData.from,
                            end: stepData.to
                        })
                    }
                    map.forEach((start: number, end: number) => {
                        changingRanges.push({start, end})
                    })
                })
            changingRanges.forEach(({start, end}) => {
                if (
                    protectedRanges.find(
                        ({from, to}) =>
                            !(
                                (start <= from && end <= from) ||
                                (start >= to && end >= to)
                            )
                    )
                ) {
                    allowed = false
                }
            })

            let allowedElements: string[] | false = false,
                allowedMarks: string[] | false = false

            changingRanges.forEach(range =>
                state.doc.nodesBetween(
                    range.start,
                    range.end,
                    (node, pos, parent, _index) => {
                        const elements = allowedElements
                        const marks = allowedMarks
                        if (parent === tr.doc) {
                            allowedElements = node.attrs.elements
                                ? (node.attrs.elements as string[]).concat(
                                      "table_caption",
                                      "table_body",
                                      "table_row",
                                      "table_cell",
                                      "table_header",
                                      "list_item",
                                      "text"
                                  )
                                : false
                            allowedMarks = node.attrs.marks
                                ? (node.attrs.marks as string[]).concat(
                                      "insertion",
                                      "deletion",
                                      "comment",
                                      "anchor"
                                  )
                                : false
                            return allowed
                        }
                        if (pos < range.start) {
                            return true
                        }
                        if (
                            Array.isArray(elements) &&
                            !elements.includes(node.type.name)
                        ) {
                            allowed = false
                        } else if (Array.isArray(marks)) {
                            node.marks.forEach(mark => {
                                if (!marks.includes(mark.type.name)) {
                                    allowed = false
                                }
                            })
                        }
                        return undefined
                    }
                )
            )

            return allowed
        }
    })
