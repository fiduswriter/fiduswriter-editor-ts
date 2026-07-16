import {Plugin, PluginKey} from "prosemirror-state"
import type {EditorState, Transaction} from "prosemirror-state"
import type {Node} from "prosemirror-model"

import type {Editor} from "../types.js"

const key = new PluginKey<{fnMarkers: FootnoteMarker[]}>("footnoteMarkers")

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

const getAddedRanges = (tr: Transaction) => {
    /* find ranges of the current document that have been added by means of
     * a transaction.
     */
    let ranges: Array<{from: number; to: number}> = []
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
        ranges = ranges.map(range => ({
            from: map.map(range.from, -1),
            to: map.map(range.to, 1)
        }))
    })

    const nonOverlappingRanges: Array<{from: number; to: number}> = []

    ranges.forEach(range => {
        let addedRange = false
        nonOverlappingRanges.forEach(noRange => {
            if (
                !addedRange &&
                range.from <= noRange.from &&
                range.to >= noRange.from
            ) {
                noRange.from = range.from
                noRange.to = noRange.to > range.to ? noRange.to : range.to
                addedRange = true
            } else if (
                !addedRange &&
                range.from <= noRange.to &&
                range.to >= noRange.to
            ) {
                noRange.from =
                    noRange.from < range.from ? noRange.from : range.from
                noRange.to = range.to
                addedRange = true
            }
        })
        if (!addedRange) {
            nonOverlappingRanges.push(range)
        }
    })

    return nonOverlappingRanges
}

export const getFootnoteMarkerContents = (state: EditorState): any[] => {
    const fnState = key.getState(state)
    if (!fnState || !fnState.fnMarkers) {
        return []
    }
    const fnMarkers = fnState.fnMarkers
    return fnMarkers.map(
        fnMarker => (state.doc.nodeAt(fnMarker.from) as Node).attrs.footnote
    )
}

export const updateFootnoteMarker = (
    state: EditorState,
    tr: Transaction,
    index: number,
    content: any
): void => {
    const fnState = key.getState(state)
    if (!fnState) {
        return
    }
    const {fnMarkers} = fnState
    const footnote = fnMarkers[index]
    if (!footnote) {
        return
    }
    const node = state.doc.nodeAt(footnote.from) as Node
    if (node.attrs.footnote === content) {
        return
    }
    tr.setNodeMarkup(footnote.from, node.type, {
        footnote: content
    })
    tr.setMeta("fromFootnote", true)
}

export const getFootnoteMarkers = (state: EditorState): FootnoteMarker[] => {
    const fnState = key.getState(state)
    if (!fnState) {
        return []
    }
    return fnState.fnMarkers
}

export const footnoteMarkersPlugin = (options: {editor: Editor}) =>
    new Plugin<{fnMarkers: FootnoteMarker[]}>({
        key,
        state: {
            init(_config, state) {
                const fnMarkers: FootnoteMarker[] = []
                state.doc.descendants((node, pos) => {
                    if (node.type.name === "footnote") {
                        fnMarkers.push({
                            from: pos,
                            to: pos + node.nodeSize
                        })
                    }
                })

                return {
                    fnMarkers
                }
            },
            apply(tr, _prev, oldState, state) {
                const meta = tr.getMeta(key)
                if (meta) {
                    return meta
                }

                let fnMarkers: FootnoteMarker[] = []

                const prevState = key.getState(oldState)
                if (prevState) {
                    fnMarkers = prevState.fnMarkers
                }

                if (!tr.docChanged) {
                    return {
                        fnMarkers
                    }
                }

                const remote = tr.getMeta("remote"),
                    fromFootnote = tr.getMeta("fromFootnote"),
                    ranges = getAddedRanges(tr),
                    deletedFootnotesIndexes: number[] = []
                fnMarkers = fnMarkers
                    .map(marker => ({
                        from: tr.mapping.map(marker.from, 1),
                        to: tr.mapping.map(marker.to, -1)
                    }))
                    .filter((marker, index) => {
                        if (marker.from !== marker.to - 1) {
                            deletedFootnotesIndexes.unshift(index)
                            return false
                        }
                        return true
                    })
                if (fromFootnote) {
                    return {fnMarkers}
                }
                const footTr =
                    options.editor.mod.footnotes!.fnEditor.view.state.tr

                footTr.setMeta("fromMain", true)

                deletedFootnotesIndexes.forEach(index =>
                    options.editor.mod.footnotes!.fnEditor.removeFootnote(
                        index,
                        footTr
                    )
                )
                ranges.forEach(range => {
                    let newFootnotes = findFootnoteMarkers(
                        range.from,
                        range.to,
                        tr.doc
                    )
                    if (newFootnotes.length) {
                        const firstFn = newFootnotes[0]
                        let offset = fnMarkers.findIndex(
                            marker => marker.from > firstFn.from
                        )
                        if (offset < 0) {
                            offset = fnMarkers.length
                        }
                        if (remote) {
                            newFootnotes = newFootnotes.filter(
                                newMarker =>
                                    !fnMarkers.find(
                                        oldMarker =>
                                            oldMarker.from === newMarker.from
                                    )
                            )
                        } else {
                            newFootnotes.forEach((footnote, index) => {
                                const fnContent = (
                                    state.doc.nodeAt(
                                        footnote.from
                                    ) as Node
                                ).attrs.footnote
                                options.editor.mod.footnotes!.fnEditor.renderFootnote(
                                    fnContent,
                                    offset + index,
                                    footTr
                                )
                            })
                        }
                        fnMarkers = fnMarkers
                            .concat(newFootnotes)
                            .sort((a, b) => (a.from > b.from ? 1 : -1))
                    }
                })

                const footMeta: Record<string, unknown> | undefined =
                    tr.getMeta("toFoot")

                if (footMeta) {
                    Object.entries(footMeta).forEach(([key, value]) => {
                        footTr.setMeta(key, value)
                    })
                }

                if (footTr.docChanged || footMeta) {
                    tr.setMeta("footTr", footTr)
                }

                return {
                    fnMarkers
                }
            }
        },
        view(_editorView) {
            return {
                update: (_view, _prevState) => {
                    options.editor.mod.footnotes!.layout.updateDOM()
                }
            }
        }
    })
