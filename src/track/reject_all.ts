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

export const rejectAll = (
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
                track => track.type === "insertion"
            )
        ) {
            deleteNode(tr, node, pos, map, false)
            deletedNode = true
        } else if (
            node.marks?.find(
                mark => mark.type.name === "insertion" && !mark.attrs.approved
            )
        ) {
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
                track => track.type === "deletion"
            )
        ) {
            const track = (node.attrs.track as Array<{type: string}>).filter(
                track => track.type !== "deletion"
            )
            tr.setNodeMarkup(
                map.map(pos),
                null,
                Object.assign({}, node.attrs, {track}),
                node.marks
            )
        } else if (node.marks?.find(mark => mark.type.name === "deletion")) {
            tr.removeMark(
                map.map(Math.max(pos, from)),
                map.map(Math.min(pos + node.nodeSize, to as number)),
                view.state.schema.marks.deletion
            )
        }
        const formatChangeMark = node.marks.find(
            mark => mark.type.name === "format_change"
        )

        if (node.isInline && !deletedNode && formatChangeMark) {
            ;(formatChangeMark.attrs.before as string[]).forEach(oldMark =>
                tr.step(
                    new AddMarkStep(
                        map.map(Math.max(pos, from)),
                        map.map(Math.min(pos + node.nodeSize, to as number)),
                        view.state.schema.marks[oldMark].create()
                    )
                )
            )
            ;(formatChangeMark.attrs.after as string[]).forEach(newMark => {
                const mark = node.marks.find(mark => mark.type.name === newMark)
                if (mark) {
                    tr.step(
                        new RemoveMarkStep(
                            map.map(Math.max(pos, from)),
                            map.map(Math.min(pos + node.nodeSize, to as number)),
                            mark
                        )
                    )
                }
            })

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
                node.attrs.track as Array<{
                    type: string
                    before: {type: string; attrs: Record<string, unknown>}
                }>
            ).find(track => track.type === "block_change")
            if (blockChangeTrack) {
                const track = (
                    node.attrs.track as Array<{type: string}>
                ).filter(track => track !== blockChangeTrack)
                tr.setNodeMarkup(
                    map.map(pos),
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
        }

        return true
    })

    deactivateAllSelectedChanges(tr)

    if (tr.steps.length) {
        view.dispatch(tr)
    }
}
