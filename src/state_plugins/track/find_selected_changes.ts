import type {EditorState} from "prosemirror-state"
import type {Mark} from "prosemirror-model"

import {getFromToMark} from "./helpers.js"

interface SelectedChangeRange {
    from: number
    to: number
}

interface SelectedChanges {
    insertion: SelectedChangeRange | false | null
    deletion: SelectedChangeRange | false | null
    formatChange: SelectedChangeRange | false | null
}

export function findSelectedChanges(state: EditorState): SelectedChanges {
    const selection = state.selection,
        selectedChanges: SelectedChanges = {
            insertion: false,
            deletion: false,
            formatChange: false
        }
    let insertionPos: number | false = false,
        deletionPos: number | false = false,
        formatChangePos: number | false = false,
        insertionMark: Mark | {type: string} | undefined,
        deletionMark: Mark | {type: string} | undefined,
        formatChangeMark: Mark | {type: string} | undefined,
        insertionSize: number | undefined,
        deletionSize: number | undefined,
        formatChangeSize: number | undefined

    if (selection.empty) {
        const resolvedPos = state.doc.resolve(selection.from),
            marks = resolvedPos.marks()
        if (marks) {
            insertionMark = marks.find(
                mark => mark.type.name === "insertion" && !mark.attrs.approved
            )
            if (insertionMark) {
                insertionPos = selection.from
            }
            deletionMark = marks.find(mark => mark.type.name === "deletion")
            if (deletionMark) {
                deletionPos = selection.from
            }
            formatChangeMark = marks.find(
                mark => mark.type.name === "format_change"
            )
            if (formatChangeMark) {
                formatChangePos = selection.from
            }
        }
    } else {
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (pos < selection.from) {
                return true
            }
            if (!insertionMark) {
                insertionMark = node.attrs.track
                    ? (node.attrs.track as Array<{type: string}>).find(
                          trackAttr => trackAttr.type === "insertion"
                      )
                    : node.marks.find(
                          mark =>
                              mark.type.name === "insertion" &&
                              !mark.attrs.approved
                      )
                if (insertionMark) {
                    insertionPos = pos
                    if (!node.isInline) {
                        insertionSize = node.nodeSize
                    }
                }
            }
            if (!deletionMark) {
                deletionMark = node.attrs.track
                    ? (node.attrs.track as Array<{type: string}>).find(
                          trackAttr => trackAttr.type === "deletion"
                      )
                    : node.marks.find(mark => mark.type.name === "deletion")
                if (deletionMark) {
                    deletionPos = pos
                    if (!node.isInline) {
                        deletionSize = node.nodeSize
                    }
                }
            }
            if (!formatChangeMark) {
                formatChangeMark = node.marks.find(
                    mark => mark.type.name === "format_change"
                )
                if (formatChangeMark) {
                    formatChangePos = pos
                    if (!node.isInline) {
                        formatChangeSize = node.nodeSize
                    }
                }
            }
            return true
        })
    }
    if (insertionMark && insertionPos !== false) {
        selectedChanges.insertion = insertionSize
            ? {from: insertionPos, to: insertionPos + insertionSize}
            : getFromToMark(state.doc, insertionPos, insertionMark as Mark)
    }

    if (deletionMark && deletionPos !== false) {
        selectedChanges.deletion = deletionSize
            ? {from: deletionPos, to: deletionPos + deletionSize}
            : getFromToMark(state.doc, deletionPos, deletionMark as Mark)
    }

    if (formatChangeMark && formatChangePos !== false) {
        selectedChanges.formatChange = formatChangeSize
            ? {from: formatChangePos, to: formatChangePos + formatChangeSize}
            : getFromToMark(state.doc, formatChangePos, formatChangeMark as Mark)
    }
    return selectedChanges
}
