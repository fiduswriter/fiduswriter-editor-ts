import {noSpaceTmp} from "fwtoolkit"
import type {Mark, Node, Schema} from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"
import {NodeSelection, Plugin, PluginKey} from "prosemirror-state"
import type {EditorState, Transaction} from "prosemirror-state"
import {Mapping} from "prosemirror-transform"
import {Decoration, DecorationSet} from "prosemirror-view"
import type {EditorView} from "prosemirror-view"

import {changeSet} from "../changeset.js"
import {readOnlyFnEditor} from "../footnotes.js"
import {
    addDeletionMarks,
    dispatchRemoveDiffdata,
    removeDiffFromJson,
    updateMarkData
} from "../tools.js"
import {
    acceptChanges,
    addDeletedContentBack,
    copyChange,
    deleteContent,
    handleMarks,
    removeDecoration
} from "./action.js"

interface DiffPluginState {
    baseTr: Transaction | false
    deletionClass: string | false
    decos: DecorationSet
}

interface MergeEditorLike {
    schema: Schema
    cpDoc: Node
    offlineDoc: Node
    onlineDoc: Node
    offlineTr: Transaction
    onlineTr: Transaction
    mergeView1: EditorView
    mergeView2: EditorView
    mergeView3: EditorView
    imageDataModified: Record<string, number>
    offlineTrackedSteps: number[]
    editor: any
    mergedDocMap: Mapping
}

function createHiglightDecoration(
    from: number,
    to: number,
    state: EditorState
): Decoration[] {
    /* Creates a yellow coloured highlight decoration when the user
    tries to look at a change */
    const deco: Decoration[] = []
    deco.push(Decoration.inline(from, to, {class: "selected-dec"}))
    state.doc.nodesBetween(from, to, (node, pos) => {
        if (
            pos < from ||
            ["bullet_list", "ordered_list"].includes(node.type.name)
        ) {
            return true
        } else if (node.isInline) {
            return false
        }
        if (node && node.attrs.diffdata && node.attrs.diffdata.length > 0) {
            deco.push(
                Decoration.node(
                    pos,
                    pos + node.nodeSize,
                    {class: "selected-dec"},
                    {}
                )
            )
        }
        return true
    })
    return deco
}

function createDeletionHighlight(
    decos: DecorationSet,
    from: number,
    to: number,
    state: EditorState,
    options: {merge: MergeEditorLike}
): DecorationSet {
    /* Creates a yellow coloured highlight decoration when the user
    tries to look at a deletion change in offline editor */

    decos.find(undefined, undefined, spec => {
        const decoId = spec.id as number | undefined
        if (decoId !== undefined) {
            const specDecoration = options.merge.mergeView2.dom.querySelector(
                `[data-decoid="${decoId}"]`
            )
            const parentEl = specDecoration?.closest(".deletion-decoration")
            if (parentEl) {
                parentEl.querySelectorAll(".online-deleted").forEach(ele => {
                    ele.classList.add("selected-dec")
                    ele.classList.add("deletion-highlight")
                })
            }
        }
        return false
    })
    const inlineDeco = Decoration.inline(
        from,
        to,
        {class: "selected-dec"},
        {type: "deletion-highlight"}
    )
    const deco: Decoration[] = []
    deco.push(inlineDeco)
    state.doc.nodesBetween(from, to, (node, pos) => {
        if (
            pos < from ||
            ["bullet_list", "ordered_list"].includes(node.type.name)
        ) {
            return true
        } else if (node.isInline) {
            return false
        }
        if (node.attrs.diffdata) {
            deco.push(
                Decoration.node(
                    pos,
                    pos + node.nodeSize,
                    {class: "selected-dec"},
                    {type: "deletion-highlight"}
                )
            )
        }
        return true
    })
    return decos.add(state.doc, deco)
}

function createLinkDropUp(mark: Mark): HTMLElement {
    const dom = document.createElement("span")
    dom.classList.add("link-drop-up-outer")
    dom.innerHTML = noSpaceTmp`
        <div class="link-drop-up-inner">
            <span>Link:${mark.attrs.href}</span>
        </div>
        `
    return dom
}

function getDecos(
    decos: DecorationSet,
    merge: MergeEditorLike,
    state: EditorState
): DecorationSet {
    /* Creates PM deco for the change popup */
    const $head = state.selection.$head
    const currentMarks: Mark[] = []
    const diffMark = $head.marks().find(mark => mark.type.name === "diffdata")
    const linkMark = $head.marks().find(mark => mark.type.name === "link")

    decos = decos.remove(
        decos.find(undefined, undefined, spec => {
            if (spec.type && spec.type == "deletion") {
                return false
            } else {
                return true
            }
        })
    )

    if (diffMark) {
        currentMarks.push(diffMark)
    }
    if (!currentMarks.length) {
        const node =
            state.selection instanceof NodeSelection
                ? state.selection.node
                : state.selection.$head.parent
        const markFound: {
            attrs?: {
                diff?: string
                from?: number
                to?: number
                steps?: string
            }
        } = {}
        if (node && node.attrs.diffdata && node.attrs.diffdata.length > 0) {
            markFound.attrs = {}
            markFound.attrs.diff = node.attrs.diffdata[0].type as string
            markFound.attrs.from = node.attrs.diffdata[0].from as number
            markFound.attrs.to = node.attrs.diffdata[0].to as number
            markFound.attrs.steps = JSON.stringify(
                node.attrs.diffdata[0].steps
            )

            const startPos = $head.pos // position of block start.
            const dom = createDropUp(
                    merge,
                    markFound as unknown as Mark,
                    linkMark
                ),
                deco = Decoration.widget(startPos, dom)
            const highlightDecos = createHiglightDecoration(
                markFound.attrs.from,
                markFound.attrs.to,
                state
            )
            highlightDecos.push(deco)
            return decos.add(state.doc, highlightDecos)
        } else if (node.marks.find(mark => mark.type.name == "diffdata")) {
            const foundMark = node.marks.find(
                mark => mark.type.name == "diffdata"
            )!
            const startPos = $head.pos // position of block start.
            const dom = createDropUp(merge, foundMark, linkMark),
                deco = Decoration.widget(startPos, dom)
            const highlightDecos = createHiglightDecoration(
                foundMark.attrs.from as number,
                foundMark.attrs.to as number,
                state
            )
            highlightDecos.push(deco)
            return decos.add(state.doc, highlightDecos)
        } else if (linkMark) {
            const startPos = $head.pos
            const dom = createLinkDropUp(linkMark),
                deco = Decoration.widget(startPos, dom)
            return decos.add(state.doc, [deco])
        }
        return decos
    }
    if (!diffMark) {
        return decos
    }
    const startPos = diffMark.attrs.to as number
    const dom = createDropUp(merge, diffMark, linkMark),
        deco = Decoration.widget(startPos, dom)
    const highlightDecos = createHiglightDecoration(
        diffMark.attrs.from as number,
        diffMark.attrs.to as number,
        state
    )
    highlightDecos.push(deco)
    return decos.add(state.doc, highlightDecos)
}

function deletionDecorations(
    decos: DecorationSet,
    merge: MergeEditorLike,
    doc: Node,
    tr: Transaction,
    deletionClass: string
): DecorationSet {
    let index = 0
    let stepsTrackedByChangeset: number[] = []
    const changeset = new changeSet(tr).getChangeSet(),
        schema = merge.schema,
        commonDoc = merge.cpDoc,
        mapping = tr.mapping
    changeset.changes.forEach(change => {
        if (change.deleted.length > 0) {
            const dom = document.createElement("span")
            const slice = commonDoc.slice(change.fromA, change.toA)

            // Apply the marks before trying to serialize!!!!
            let stepsInvolved: number[] = []
            change.deleted.forEach(deletion =>
                stepsInvolved.push(Number.parseInt(String(deletion.data.step)))
            )
            const stepsSet = new Set(stepsInvolved)
            stepsInvolved = Array.from(stepsSet)
            stepsInvolved.sort((a, b) => a - b)
            stepsTrackedByChangeset =
                stepsTrackedByChangeset.concat(stepsInvolved)
            const deletionMark = schema.marks.diffdata.create({
                diff: deletionClass,
                steps: JSON.stringify(stepsInvolved),
                from: change.fromA,
                to: change.toA,
                markOnly: false
            })

            // Slice with marked contents
            const content = addDeletionMarks(slice, deletionMark, schema)
            const deletedContent =
                DOMSerializer.fromSchema(schema).serializeFragment(content)

            // Parse HTML to accomodate minor changes
            if (deletedContent.querySelector("tr,td")) {
                const tbody = document.createElement("tbody")
                tbody.appendChild(deletedContent)
                dom.appendChild(tbody)
            } else {
                dom.appendChild(deletedContent)
            }
            dom.querySelectorAll("span.footnote-marker").forEach(
                footnoteElement => {
                    const newFnElement = readOnlyFnEditor(
                        footnoteElement as HTMLElement
                    )
                    newFnElement.classList.add("deleted-footnote-element")
                    newFnElement.classList.add(deletionClass)
                    footnoteElement.parentNode!.appendChild(newFnElement)
                    footnoteElement.remove()
                }
            )
            dom.classList.add("deletion-decoration")
            dom.dataset.delfrom = String(change.fromA)
            dom.dataset.delto = String(change.toA)

            const dropUp = createDropUp(merge, deletionMark, undefined)
            dropUp.dataset.decoid = String(index)
            dropUp.style.display = "none"
            dom.appendChild(dropUp)

            // Put decoration in proper place. In case of a footnote change, the original content
            // is put first, decoration is shown after the content
            let pos = mapping.map(change.fromA)
            if (
                (change as any).lenA == (change as any).lenB &&
                stepsInvolved.length == 1
            ) {
                const JSONSlice = slice.toJSON()
                if (
                    JSONSlice.content &&
                    JSONSlice.content.length == 1 &&
                    JSONSlice.content[0].type === "footnote"
                ) {
                    pos += 1
                }
            }
            decos = decos.add(doc, [
                Decoration.widget(pos, dom, {type: "deletion", id: index})
            ])
            index += 1
        }
    })
    if (deletionClass == "offline-deleted") {
        merge.offlineTrackedSteps =
            merge.offlineTrackedSteps.concat(stepsTrackedByChangeset)
    }
    return decos
}

function createDropUp(
    merge: MergeEditorLike,
    diffMark: Mark,
    linkMark: Mark | undefined
): HTMLElement {
    /* The actual function that creates a drop up */
    const dropUp = document.createElement("span")
    const requiredPx = 10
    const tr =
        String(diffMark.attrs.diff).search("offline") != -1
            ? merge.offlineTr
            : merge.onlineTr
    const trType =
        String(diffMark.attrs.diff).search("offline") != -1
            ? "offline"
            : "online"
    const opType =
        String(diffMark.attrs.diff).search("inserted") != -1
            ? "insertion"
            : "deletion"
    let textToBeDisplayed = ""

    if (diffMark.attrs.markOnly) {
        textToBeDisplayed = gettext("Format Change")
    } else {
        if (trType == "online") {
            if (opType == "insertion") {
                textToBeDisplayed = gettext("Inserted by online users")
            } else {
                textToBeDisplayed = gettext("Deleted by online users")
            }
        } else {
            if (opType == "insertion") {
                textToBeDisplayed = gettext("Inserted by you")
            } else {
                textToBeDisplayed = gettext("Deleted by you")
            }
        }
    }
    const safeLinkMark = linkMark === undefined ? false : linkMark
    dropUp.classList.add("drop-up-outer")
    dropUp.innerHTML = noSpaceTmp`
        <div class="link drop-up-inner" style="top: -${requiredPx}px;">
            ${
                diffMark
                    ? `<div class="drop-up-head">
                    ${
                        diffMark.attrs.diff
                            ? `<div class="link-title">${gettext("Change")}:&nbsp; ${textToBeDisplayed}</div>`
                            : ""
                    }
                    ${
                        safeLinkMark
                            ? `<div> Link : ${safeLinkMark.attrs.href}</div>`
                            : ""
                    }
                    ${
                        safeLinkMark
                            ? `<div> Type : ${safeLinkMark.attrs.href[0] == "#" ? "internal" : "external"}</div>`
                            : ""
                    }
                </div>
                <ul class="drop-up-options">
                    <li class="accept-change" title="${gettext("Accept change")}">
                        ${gettext("Accept Change")}
                    </li>
                    <li class="reject-change" title="${gettext("Reject change")}">
                        ${gettext("Reject Change")}
                    </li>
                    <li class="copy-data" title="${gettext("Copy content")}">
                        ${gettext("Copy")}
                    </li>
                </ul>`
                    : ""
            }
        </div>`

    const acceptChange = dropUp.querySelector(".accept-change")
    if (acceptChange) {
        acceptChange.addEventListener("mousedown", event => {
            event.preventDefault()
            event.stopImmediatePropagation()
            try {
                if (trType == "online") {
                    if (opType == "insertion") {
                        dispatchRemoveDiffdata(
                            merge.mergeView2,
                            diffMark.attrs.from as number,
                            diffMark.attrs.to as number
                        )
                    } else {
                        // remove online deletion decoration
                        const decorationId = dropUp.dataset.decoid
                        removeDecoration(
                            merge.mergeView2,
                            decorationId as string
                        )
                    }
                } else {
                    if (opType == "insertion") {
                        acceptChanges(
                            merge,
                            diffMark,
                            merge.mergeView2,
                            merge.mergeView3,
                            tr
                        )
                    } else {
                        // remove offline deletion decoration
                        const decorationId = dropUp.dataset.decoid
                        if (
                            deleteContent(merge, merge.mergeView2, diffMark)
                        ) {
                            merge.mergeView2.dispatch(
                                merge.mergeView2.state.tr.setMeta(
                                    "removeHighlight",
                                    true
                                )
                            )
                            removeDecoration(
                                merge.mergeView3,
                                decorationId as string
                            )
                        }
                    }
                }
            } catch (error) {
                const onlineDoc = merge.editor.schema.nodeFromJSON(
                    removeDiffFromJson(merge.onlineDoc.toJSON())
                )
                const offlineDoc = merge.editor.schema.nodeFromJSON(
                    removeDiffFromJson(merge.offlineDoc.toJSON())
                )

                // Handle merge failure
                merge.editor.mod.collab.doc.merge.handleMergeFailure(
                    error as Error,
                    offlineDoc,
                    onlineDoc,
                    merge
                )
            }
        })
    }
    const rejectChange = dropUp.querySelector(".reject-change")
    if (rejectChange) {
        rejectChange.addEventListener("mousedown", event => {
            event.preventDefault()
            event.stopImmediatePropagation()
            try {
                if (trType == "online") {
                    if (opType == "insertion") {
                        // Delete inserted content
                        if (diffMark.attrs.markOnly) {
                            handleMarks(
                                merge.mergeView2,
                                diffMark,
                                tr,
                                merge.schema
                            )
                            dispatchRemoveDiffdata(
                                merge.mergeView2,
                                diffMark.attrs.from as number,
                                diffMark.attrs.to as number
                            )
                        } else {
                            deleteContent(
                                merge,
                                merge.mergeView2,
                                diffMark,
                                false
                            )
                        }
                    } else {
                        // remove online deletion decoration
                        if (
                            addDeletedContentBack(
                                merge,
                                merge.mergeView2,
                                diffMark
                            )
                        ) {
                            const decorationId = dropUp.dataset.decoid
                            removeDecoration(
                                merge.mergeView2,
                                decorationId as string
                            )
                        }
                    }
                } else {
                    if (opType == "insertion") {
                        dispatchRemoveDiffdata(
                            merge.mergeView3,
                            diffMark.attrs.from as number,
                            diffMark.attrs.to as number
                        )
                    } else {
                        // remove offline deletion decoration
                        const target = event.target as HTMLElement
                        const parentEl = target.closest(
                            ".deletion-decoration"
                        )
                        if (!parentEl) {
                            return
                        }
                        parentEl.classList.remove("offline-deleted")
                        parentEl.classList.remove("deletion-decoration")
                        parentEl
                            .querySelectorAll(".offline-deleted")
                            .forEach(ele => {
                                ele.classList.remove("offline-deleted")
                                ele.classList.remove("selected-dec")
                            })
                        dropUp.remove()
                        merge.mergeView2.dispatch(
                            merge.mergeView2.state.tr.setMeta(
                                "removeHighlight",
                                true
                            )
                        )
                    }
                }
            } catch (error) {
                const onlineDoc = merge.editor.schema.nodeFromJSON(
                    removeDiffFromJson(merge.onlineDoc.toJSON())
                )
                const offlineDoc = merge.editor.schema.nodeFromJSON(
                    removeDiffFromJson(merge.offlineDoc.toJSON())
                )

                // Handle merge failure
                merge.editor.mod.collab.doc.merge.handleMergeFailure(
                    error as Error,
                    offlineDoc,
                    onlineDoc,
                    merge
                )
            }
        })
    }

    const copyData = dropUp.querySelector(".copy-data")
    if (copyData) {
        copyData.addEventListener("mousedown", event => {
            event.preventDefault()
            event.stopImmediatePropagation()
            if (trType == "online") {
                if (opType == "insertion") {
                    copyChange(
                        merge.mergeView2,
                        diffMark.attrs.from as number,
                        diffMark.attrs.to as number
                    )
                } else {
                    copyChange(
                        merge.mergeView1,
                        diffMark.attrs.from as number,
                        diffMark.attrs.to as number
                    )
                }
            } else {
                if (opType == "insertion") {
                    copyChange(
                        merge.mergeView3,
                        diffMark.attrs.from as number,
                        diffMark.attrs.to as number
                    )
                } else {
                    copyChange(
                        merge.mergeView1,
                        diffMark.attrs.from as number,
                        diffMark.attrs.to as number
                    )
                }
            }
        })
    }
    return dropUp
}

export const key = new PluginKey<DiffPluginState>("mergeDiff")

export const diffPlugin = (options: {merge: MergeEditorLike}) =>
    new Plugin<DiffPluginState>({
        key,
        state: {
            init(config): DiffPluginState {
                let baseTr: Transaction | false = false
                let deletionClass: string | false = false
                let decos = DecorationSet.empty
                const doc = config.doc
                if (doc?.eq(options.merge.offlineDoc)) {
                    baseTr = options.merge.offlineTr
                    deletionClass = "offline-deleted"
                } else if (doc?.eq(options.merge.onlineDoc)) {
                    baseTr = options.merge.onlineTr
                    deletionClass = "online-deleted"
                }
                if (baseTr && doc) {
                    decos = deletionDecorations(
                        decos,
                        options.merge,
                        doc,
                        baseTr,
                        deletionClass as string
                    )
                }
                return {
                    baseTr: baseTr,
                    deletionClass: deletionClass,
                    decos: decos
                }
            },
            apply(tr, _prev, oldState, state): DiffPluginState {
                const oldPluginState = key.getState(oldState)!
                let {decos} = oldPluginState
                const {baseTr, deletionClass} = oldPluginState

                let newDecos = getDecos(decos, options.merge, state)

                if (tr.getMeta("removeHighlight")) {
                    newDecos = newDecos.remove(
                        newDecos.find(
                            undefined,
                            undefined,
                            spec => spec.type == "deletion-highlight"
                        )
                    )

                    // Remove the class set on deletion decorations
                    options.merge.mergeView2.dom
                        .querySelectorAll(".selected-dec.deletion-highlight")
                        .forEach(ele => {
                            ele.classList.remove("selected-dec")
                            ele.classList.remove("deletion-highlight")
                        })
                }
                if (tr.getMeta("decorationId")) {
                    const decorationId = Number.parseInt(
                        tr.getMeta("decorationId")
                    )
                    newDecos = newDecos.remove(
                        newDecos.find(
                            undefined,
                            undefined,
                            spec => spec.id == decorationId
                        )
                    )
                }
                if (tr.getMeta("highlight")) {
                    const data = tr.getMeta("highlight") as {
                        from: string
                        to: string
                    }
                    const from = options.merge.mergedDocMap.map(
                        Number.parseInt(data.from)
                    )
                    const to = options.merge.mergedDocMap.map(
                        Number.parseInt(data.to)
                    )
                    if (from && to) {
                        newDecos = createDeletionHighlight(
                            newDecos,
                            from,
                            to,
                            state,
                            options
                        )
                    }
                }

                if (tr.getMeta("initialDiffMap")) {
                    // If it is initial diffMap we update mark data
                    // So no need to update the deco's position.
                    newDecos = newDecos.map(new Mapping(), tr.doc)
                } else {
                    newDecos = newDecos.map(tr.mapping, tr.doc)
                }
                return {
                    baseTr: baseTr,
                    deletionClass: deletionClass,
                    decos: newDecos
                }
            }
        },
        props: {
            handleClick: (view, _pos, event) => {
                const $pos = view.state.doc.resolve(_pos)
                if (
                    $pos.parent &&
                    $pos.parent.type.name == "figure"
                ) {
                    // If the click is on a Fig element set up a node selection
                    // so that accept/reject options are shown properly.
                    const tr = view.state.tr
                    const $updatedPos = view.state.doc.resolve(
                        _pos - ($pos.parentOffset + 1)
                    )
                    tr.setSelection(new NodeSelection($updatedPos))
                    view.dispatch(tr)
                }

                const delDeco = view.dom.querySelectorAll(
                    ".offline-deleted,.online-deleted"
                )
                delDeco.forEach(item =>
                    item.classList.remove("selected-dec")
                )
                const delPopUp = view.dom.querySelectorAll(
                    ".deletion-decoration .drop-up-outer"
                )
                delPopUp.forEach(
                    popUp => ((popUp as HTMLElement).style.display = "none")
                )
                const delFnToolTip = view.dom.querySelectorAll(
                    ".deleted-footnote-element"
                )
                delFnToolTip.forEach(tooltip =>
                    ((tooltip.childNodes[0] as HTMLElement).style.display =
                        "none")
                )
                options.merge.mergeView2.dispatch(
                    options.merge.mergeView2.state.tr.setMeta(
                        "removeHighlight",
                        true
                    )
                )
                const target = event.target as HTMLElement
                const offlineDeleted = target.closest(".offline-deleted")
                if (offlineDeleted) {
                    const parentEl = target.closest(".deletion-decoration")
                    if (!parentEl) {
                        return false
                    }
                    const highlightEle =
                        parentEl.querySelectorAll(".offline-deleted")
                    highlightEle.forEach(ele =>
                        ele.classList.add("selected-dec")
                    )
                    ;(
                        parentEl.querySelector(".drop-up-outer") as HTMLElement
                    ).style.display = "block"

                    // Add a decoration to highlight decoration to the online/merged view
                    options.merge.mergeView2.dispatch(
                        options.merge.mergeView2.state.tr.setMeta("highlight", {
                            from: (parentEl as HTMLElement).dataset.delfrom,
                            to: (parentEl as HTMLElement).dataset.delto
                        })
                    )
                } else {
                    const onlineDeleted = target.closest(".online-deleted")
                    if (onlineDeleted) {
                        const parentEl = target.closest(".deletion-decoration")
                        if (!parentEl) {
                            return false
                        }
                        const highlightEle =
                            parentEl.querySelectorAll(".online-deleted")
                        highlightEle.forEach(ele =>
                            ele.classList.add("selected-dec")
                        )
                        ;(
                            parentEl.querySelector(
                                ".drop-up-outer"
                            ) as HTMLElement
                        ).style.display = "block"
                    }
                }
                if (target.matches(".deleted-footnote-element")) {
                    ;(
                        target.childNodes[0] as HTMLElement
                    ).style.display = "block"
                }
                return false
            },
            decorations(state) {
                const pluginState = key.getState(state)
                if (!pluginState) {
                    return DecorationSet.empty
                }
                const {decos} = pluginState
                return decos
            }
        },
        view(_view) {
            return {
                update: view => {
                    // Make sure that pop stays inside the view.
                    const changePopUp = view.dom.querySelector(
                        ".drop-up-outer"
                    ) as HTMLElement | null
                    if (changePopUp) {
                        const bounding = changePopUp.getBoundingClientRect()
                        const dialogBox = document.querySelector(
                            "#editor-merge-view"
                        ) as HTMLElement | null
                        if (dialogBox) {
                            if (
                                bounding.right > dialogBox.offsetWidth ||
                                bounding.right >
                                    (window.innerWidth ||
                                        document.documentElement.clientWidth)
                            ) {
                                changePopUp.style.left = "100px"
                            }
                        }
                    }

                    // Make sure that the deletion decoration footnote stays inside the view
                    const footnote = view.dom.querySelector(
                        ".offline-deleted.deleted-footnote-element .footnote-tooltip"
                    ) as HTMLElement | null
                    if (footnote) {
                        const bounding = footnote.getBoundingClientRect()
                        const dialogBox = document.querySelector(
                            "#editor-merge-view"
                        ) as HTMLElement | null
                        if (dialogBox) {
                            if (
                                bounding.right > dialogBox.offsetWidth ||
                                bounding.right >
                                    (window.innerWidth ||
                                        document.documentElement.clientWidth)
                            ) {
                                footnote.style.left = "-100px"
                            }
                        }
                    }
                }
            }
        },
        appendTransaction: (trs, _oldState, newState) => {
            if (trs.every(tr => !tr.steps.length)) {
                return
            }
            const updateMarkTr = newState.tr
            trs.forEach(tr => {
                if (tr.steps.length) {
                    updateMarkData(
                        tr,
                        options.merge.imageDataModified,
                        updateMarkTr
                    )
                }
            })
            updateMarkTr.setMeta("initialDiffMap", true)
            return updateMarkTr
        }
    })
