import {AddMarkStep, Mapping, RemoveMarkStep} from "prosemirror-transform"
import type {Node} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

import {deactivateAllSelectedChanges} from "../state_plugins/track/index.js"
import {deleteNode} from "./delete.js"

export const reject = (
    type: string,
    pos: number,
    view: EditorView
): void => {
    const tr = view.state.tr.setMeta("track", true),
        map = new Mapping()
    let reachedEnd = false,
        inlineChange = false
    const nodeAtPos = view.state.doc.nodeAt(pos)
    if (!nodeAtPos) {
        return
    }
    const trackMark = nodeAtPos.marks.find(mark => mark.type.name === type)
    // Block level track changes are stored in the node's track attribute
    // rather than in marks (figures, tables, text blocks).
    const blockTrack = (
        nodeAtPos.attrs.track as Array<{type: string}> | undefined
    )?.find(track => track.type === type)
    if (!trackMark && !blockTrack) {
        return
    }
    view.state.doc.nodesBetween(
        pos,
        view.state.doc.nodeSize - 2,
        (node: Node, nodePos: number) => {
            if (nodePos < pos) {
                return true
            }
            if (reachedEnd) {
                return false
            }
            if (!node.isInline) {
                reachedEnd = true // Changes on inline nodes are applied/reject until next non-inline node. Non-inline node changes are only applied that one node by default.
                if (inlineChange) {
                    // Change has already affected inline node. Don't apply to block level.
                    return false
                }
            } else if (trackMark && !trackMark.isInSet(node.marks)) {
                if (
                    !(
                        node.attrs.track as Array<{type: string}> | undefined
                    )?.some(track => track.type === type)
                ) {
                    reachedEnd = true
                    return false
                }
                inlineChange = true
            } else if (trackMark) {
                inlineChange = true
            }
            if (type === "insertion") {
                deleteNode(tr, node, nodePos, map, false)
            } else if (type === "deletion") {
                if (node.attrs.track) {
                    const track = (node.attrs.track as Array<{type: string}>).filter(
                        track => track.type !== "deletion"
                    )
                    tr.setNodeMarkup(
                        map.map(nodePos),
                        null,
                        Object.assign({}, node.attrs, {track}),
                        node.marks
                    )
                    reachedEnd = true
                } else {
                    tr.removeMark(
                        map.map(nodePos),
                        map.map(nodePos + node.nodeSize),
                        view.state.schema.marks.deletion
                    )
                }
            } else if (type === "format_change") {
                // format_change only exists as a mark, so trackMark is
                // guaranteed to be set here (the guard above would have
                // returned otherwise).
                if (!trackMark) {
                    return
                }
                ;(trackMark.attrs.before as string[]).forEach(oldMark =>
                    tr.step(
                        new AddMarkStep(
                            map.map(nodePos),
                            map.map(nodePos + node.nodeSize),
                            view.state.schema.marks[oldMark].create()
                        )
                    )
                )
                ;(trackMark.attrs.after as string[]).forEach(newMark => {
                    const mark = node.marks.find(mark => mark.type.name === newMark)
                    if (mark) {
                        tr.step(
                            new RemoveMarkStep(
                                map.map(nodePos),
                                map.map(nodePos + node.nodeSize),
                                mark
                            )
                        )
                    }
                })
                tr.step(
                    new RemoveMarkStep(
                        map.map(nodePos),
                        map.map(nodePos + node.nodeSize),
                        trackMark
                    )
                )
            } else if (type === "block_change") {
                const blockChangeTrack = (node.attrs.track as Array<{
                        type: string
                        before: {type: string; attrs: Record<string, unknown>}
                    }> | undefined)?.find(track => track.type === "block_change"),
                    track = (node.attrs.track as Array<{type: string}> | undefined)?.filter(
                        track => track !== blockChangeTrack
                    )
                if (!blockChangeTrack) {
                    return true
                }
                tr.setNodeMarkup(
                    map.map(nodePos),
                    view.state.schema.nodes[blockChangeTrack.before.type],
                    Object.assign(
                        {},
                        node.attrs,
                        blockChangeTrack.before.attrs,
                        {
                            track
                        }
                    ),
                    node.marks
                )
            }
            return true
        }
    )

    deactivateAllSelectedChanges(tr)

    if (tr.steps.length) {
        view.dispatch(tr)
    }
}
