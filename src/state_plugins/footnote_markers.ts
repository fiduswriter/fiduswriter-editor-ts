import {Plugin, PluginKey} from "prosemirror-state"
import type {EditorState, Transaction} from "prosemirror-state"
import type {Node} from "prosemirror-model"

const key = new PluginKey("footnoteMarkers")

export interface FootnoteMarker {
    from: number
    to: number
}

export const findFootnoteMarkers = (
    fromPos: number,
    toPos: number,
    doc: Node
): FootnoteMarker[] => {
    const footnoteMarkers: FootnoteMarker[] = []
    doc.nodesBetween(fromPos, toPos, (node, pos) => {
        if (!node.isInline) {
            return
        }
        if (node.type.name === "footnote") {
            const from = pos
            const to = pos + node.nodeSize
            const footnoteMarker = {from, to}
            footnoteMarkers.push(footnoteMarker)
        }
    })
    return footnoteMarkers
}

export const getFootnoteMarkers = (state: EditorState): FootnoteMarker[] =>
    findFootnoteMarkers(0, state.doc.content.size, state.doc)

export const getFootnoteMarkerContents = (state: EditorState): any[] =>
    getFootnoteMarkers(state).map(marker => {
        const node = state.doc.nodeAt(marker.from)
        return node ? node.attrs.footnote : undefined
    })

export const updateFootnoteMarker = (
    state: EditorState,
    tr: Transaction,
    index: number,
    content: any
): void => {
    const markers = getFootnoteMarkers(state)
    const marker = markers[index]
    if (!marker) {
        return
    }
    const node = state.doc.nodeAt(marker.from)
    if (!node) {
        return
    }
    tr.setNodeMarkup(marker.from, null, {
        ...node.attrs,
        footnote: content
    })
}

const getAddedRanges = (tr: Transaction) => {
    /* find ranges of the current document that have been added by means of
     * a transaction.
     */
    const ranges: Array<{from: number; to: number}> = []
    tr.steps.forEach((step, index) => {
        const stepData = step as unknown as Record<string, unknown>
        if (
            stepData.jsonID === "replace" ||
            stepData.jsonID === "replaceWrap"
        ) {
            ranges.push({
                from: stepData.from as number,
                to: stepData.to as number
            })
        }
        const map = tr.mapping.maps[index]
        map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
            ranges.push({from: newStart, to: newEnd})
        })
    })
    return ranges
}

const getDeletedRanges = (tr: Transaction) => {
    const ranges: Array<{from: number; to: number}> = []
    tr.steps.forEach((step, index) => {
        const stepData = step as unknown as Record<string, unknown>
        if (
            stepData.jsonID === "replace" ||
            stepData.jsonID === "replaceWrap"
        ) {
            const map = tr.mapping.maps[index]
            map.forEach((oldStart, oldEnd, _newStart, _newEnd) => {
                if (oldStart !== oldEnd) {
                    ranges.push({from: oldStart, to: oldEnd})
                }
            })
        }
    })
    return ranges
}

const getNewFootnotes = (tr: Transaction) => {
    const addedRanges = getAddedRanges(tr)
    return addedRanges
        .map(range => findFootnoteMarkers(range.from, range.to, tr.doc))
        .flat()
}

const getDeletedFootnotes = (tr: Transaction) => {
    const deletedRanges = getDeletedRanges(tr)
    return deletedRanges
        .map(range => findFootnoteMarkers(range.from, range.to, tr.before))
        .flat()
}

export const footnoteMarkersPlugin = (_options: {editor: unknown}) =>
    new Plugin({
        key,
        appendTransaction: (trs, _oldState, newState) => {
            const modified = trs.reduce(
                (modified, tr) => modified || tr.docChanged,
                false
            )
            if (!modified) {
                return
            }
            const addedFootnotes = trs.map(tr => getNewFootnotes(tr)).flat()
            const deletedFootnotes = trs.map(tr => getDeletedFootnotes(tr)).flat()

            if (!addedFootnotes.length && !deletedFootnotes.length) {
                return
            }
            const tr = newState.tr.setMeta("footnoteMarkers", {
                addedFootnotes,
                deletedFootnotes
            })
            return tr
        }
    })
