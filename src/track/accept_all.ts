import {Slice} from "prosemirror-model"
import {
    AddMarkStep,
    Mapping,
    RemoveMarkStep,
    ReplaceStep
} from "prosemirror-transform"
import type {Node} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

import {deactivateAllSelectedChanges} from "../state_plugins/track/index.js"

import {deleteNode} from "./delete.js"

export const acceptAll = (
    view: EditorView,
    from = 0,
    to: number | false = false
): void => {
    if (!to) {
        to = view.state.doc.content.size
    }
    const tr = view.state.tr.setMeta("track", true),
        map = new Mapping()
    view.state.doc.nodesBetween(from, to, (node: Node, pos: number) => {
        if (pos < from && !node.isInline) {
            return true
        }
        let deletedNode = false
        if (
            (node.attrs.track as Array<{type: string}> | undefined)?.find(
                track => track.type === "deletion"
            )
        ) {
            deleteNode(tr, node, pos, map, true)
            deletedNode = true
        } else if (node.marks?.find(mark => mark.type.name === "deletion")) {
            const delStep = new ReplaceStep(
                map.map(Math.max(pos, from)),
                map.map(Math.min(pos + node.nodeSize, to as number)),
                Slice.empty
            )
            tr.step(delStep)
            map.appendMap(delStep.getMap())
            deletedNode = true
        } else if (
            (node.attrs.track as Array<{type: string}> | undefined)?.find(
                track => track.type === "insertion"
            )
        ) {
            const track = (node.attrs.track as Array<{type: string}>).filter(
                track => track.type !== "insertion"
            )
            tr.setNodeMarkup(
                map.map(pos),
                null,
                Object.assign({}, node.attrs, {track}),
                node.marks
            )
        } else if (
            node.marks?.find(
                mark => mark.type.name === "insertion" && !mark.attrs.approved
            )
        ) {
            const mark = node.marks.find(mark => mark.type.name === "insertion"),
                attrs = Object.assign({}, mark?.attrs, {approved: true})
            tr.step(
                new AddMarkStep(
                    map.map(Math.max(pos, from)),
                    map.map(Math.min(pos + node.nodeSize, to as number)),
                    view.state.schema.marks.insertion.create(attrs)
                )
            )
        }
        const formatChangeMark = node.marks.find(
            mark => mark.type.name === "format_change"
        )
        if (node.isInline && !deletedNode && formatChangeMark) {
            tr.step(
                new RemoveMarkStep(
                    map.map(Math.max(pos, from)),
                    map.map(Math.min(pos + node.nodeSize, to as number)),
                    formatChangeMark
                )
            )
        }

        if (!node.isInline && !deletedNode && node.attrs.track) {
            const blockChangeTrack = (
                node.attrs.track as Array<{type: string}>
            ).find(track => track.type === "block_change")
            if (blockChangeTrack) {
                const track = (node.attrs.track as Array<{type: string}>).filter(
                    track => track !== blockChangeTrack
                )
                tr.setNodeMarkup(
                    map.map(pos),
                    null,
                    Object.assign({}, node.attrs, {track}),
                    node.marks
                )
            }
        }

        return true
    })

    deactivateAllSelectedChanges(tr)

    if (tr.steps.length) {
        view.dispatch(tr)
    }
}
