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

// True while the document still holds entries this function handles. A
// deletion can merge or remove nodes later in the walk whose track entries
// then escape the single pass (their mapped positions no longer point at
// the node); iterating clears any leftovers.
const hasHandledEntries = (
    doc: {
        nodesBetween: (
            from: number,
            to: number,
            callback: (node: Node) => boolean
        ) => void
        content: {size: number}
    },
    from: number,
    to: number
): boolean => {
    let found = false
    doc.nodesBetween(from, to, (node: Node) => {
        if (found) {
            return false
        }
        if (
            (node.attrs.track as Array<{type: string}> | undefined)?.some(
                track =>
                    ["deletion", "insertion", "block_change"].includes(
                        track.type
                    )
            )
        ) {
            found = true
            return false
        }
        if (
            node.marks?.some(
                mark =>
                    mark.type.name === "deletion" ||
                    mark.type.name === "format_change" ||
                    (mark.type.name === "insertion" && !mark.attrs.approved)
            )
        ) {
            found = true
            return false
        }
        return true
    })
    return found
}

export const rejectAll = (
    view: EditorView,
    from = 0,
    to: number | false = false,
    pass = 0
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
            const mappedPos = map.map(pos)
            // Earlier deletion steps in this run can have removed or merged
            // the node this decision was made on. Only retag it while it
            // still exists at the mapped position.
            const current = tr.doc.nodeAt(mappedPos)
            if (current && current.type === node.type) {
                tr.setNodeMarkup(
                    mappedPos,
                    null,
                    Object.assign({}, current.attrs, {track}),
                    current.marks
                )
            }
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
                            map.map(
                                Math.min(pos + node.nodeSize, to as number)
                            ),
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
        // The pass may have shrunk the document; clamp the range before
        // checking for (and clearing) leftover entries in a second pass.
        const docSize = view.state.doc.content.size
        const end =
            (to as number | false) === false
                ? docSize
                : Math.min(to as number, docSize)
        // A pass can leave entries it could not clear (a merge step that
        // no-ops); iterating usually converges in one or two extra passes,
        // but the bound guarantees termination.
        if (
            pass < 10 &&
            end >= from &&
            hasHandledEntries(view.state.doc, from, end)
        ) {
            rejectAll(view, from, end, pass + 1)
        }
    }
}
