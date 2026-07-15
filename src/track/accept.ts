import {AddMarkStep, Mapping, RemoveMarkStep} from "prosemirror-transform"
import type {Node} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

import {deactivateAllSelectedChanges} from "../state_plugins/track/index.js"

import {deleteNode} from "./delete.js"

export const accept = (
    type: string,
    pos: number,
    view: EditorView
): void => {
    const tr = view.state.tr.setMeta("track", true),
        map = new Mapping()
    let reachedEnd = false
    const nodeAtPos = view.state.doc.nodeAt(pos)
    if (!nodeAtPos) {
        return
    }
    const trackMark = nodeAtPos.marks.find(mark => mark.type.name === type)
    if (!trackMark) {
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
                reachedEnd = true
            } else if (!trackMark.isInSet(node.marks)) {
                reachedEnd = true
                return false
            }
            // Traverse only those nodes which have the track marks.
            if (
                trackMark === undefined ||
                (trackMark && trackMark.isInSet(node.marks))
            ) {
                if (type === "deletion") {
                    deleteNode(tr, node, nodePos, map, true)
                } else if (type === "insertion") {
                    if (node.attrs.track) {
                        const track = (node.attrs.track as Array<{type: string}>).filter(
                            track => track.type !== "insertion"
                        )
                        if ((node.attrs.track as Array<{type: string}>).length === track.length) {
                            return true
                        }
                        tr.setNodeMarkup(
                            map.map(nodePos),
                            null,
                            Object.assign({}, node.attrs, {track}),
                            node.marks
                        )
                        // Special case: first paragraph in list item by same user -- will also be accepted.
                        if (
                            node.type.name === "list_item" &&
                            node.child(0) &&
                            node.child(0).type.name === "paragraph"
                        ) {
                            reachedEnd = false
                        }
                    } else {
                        tr.step(
                            new AddMarkStep(
                                map.map(nodePos),
                                map.map(nodePos + node.nodeSize),
                                view.state.schema.marks.insertion.create(
                                    Object.assign({}, trackMark.attrs, {
                                        approved: true
                                    })
                                )
                            )
                        )
                    }
                } else if (type === "format_change") {
                    tr.step(
                        new RemoveMarkStep(
                            map.map(nodePos),
                            map.map(nodePos + node.nodeSize),
                            trackMark
                        )
                    )
                } else if (type === "block_change") {
                    const track = (node.attrs.track as Array<{type: string}>).filter(
                        track => track.type !== "block_change"
                    )
                    tr.setNodeMarkup(
                        map.map(nodePos),
                        null,
                        Object.assign({}, node.attrs, {track}),
                        node.marks
                    )
                }
                return true
            }
            return true
        }
    )

    deactivateAllSelectedChanges(tr)

    if (tr.steps.length) {
        view.dispatch(tr)
    }
}
