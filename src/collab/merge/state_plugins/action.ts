import {showSystemMessage} from "fwtoolkit"
import {TextSelection} from "prosemirror-state"
import {AddMarkStep, Mapping, RemoveMarkStep, Step} from "prosemirror-transform"
import type {Transaction} from "prosemirror-state"
import type {EditorView} from "prosemirror-view"
import type {Mark, Schema} from "prosemirror-model"

import {dispatchRemoveDiffdata} from "../tools.js"

interface Merge {
    mergedDocMap: Mapping
    cpDoc: import("prosemirror-model").Node
}

export const copyChange = (
    view: EditorView,
    from: number,
    to: number
): void => {
    /* when a certain change cannot be applied automatically,
    we give users the ability to copy a change */
    const tr = view.state.tr
    const resolvedFrom = view.state.doc.resolve(from)
    const resolvedTo = view.state.doc.resolve(to)
    const sel = new TextSelection(resolvedFrom, resolvedTo)
    ;(sel as {visible?: boolean}).visible = false
    tr.setSelection(sel)
    view.dispatch(tr)
    view.focus()

    const slice = view.state.selection.content()
    const {dom} = view.serializeForClipboard(slice)

    // Copy data to clipboard!!
    document.body.appendChild(dom)
    const range = document.createRange()
    range.selectNode(dom)
    window.getSelection()?.addRange(range)
    try {
        document.execCommand("copy") // Security exception may be thrown by some browsers.
        document.body.removeChild(dom)
        showSystemMessage(gettext("Change copied to clipboard."))
    } catch (_ex) {
        showSystemMessage(
            gettext("Copy to clipboard failed. Please copy manually.")
        )
    }
    window.getSelection()?.removeAllRanges()
}

export const acceptChanges = (
    merge: Merge,
    mark: Mark,
    mergeView: EditorView,
    originalView: EditorView,
    tr: Transaction
): void => {
    /* This is used to accept a change either from the offline/online version or
    incase of deletion from the middle editor */
    const mergedDocMap = new Mapping()
    mergedDocMap.appendMapping(merge.mergedDocMap)
    const insertionTr = mergeView.state.tr
    const from = mark.attrs.from as number
    const to = mark.attrs.to as number
    const steps = JSON.parse(mark.attrs.steps as string) as number[]
    const stepMaps = tr.mapping.maps
        .slice()
        .reverse()
        .map((map: import("prosemirror-transform").StepMap) => map.invert())
    const rebasedMapping = new Mapping(stepMaps)
    rebasedMapping.appendMapping(mergedDocMap)
    for (const stepIndex of steps) {
        const maps = rebasedMapping.slice(tr.steps.length - stepIndex)
        let mappedStep = tr.steps[stepIndex].map(maps)
        if (mappedStep) {
            mappedStep = Step.fromJSON(
                // Switch from main editor schema to merge editor schema
                insertionTr.doc.type.schema,
                mappedStep.toJSON()
            )
        }
        if (mappedStep && !insertionTr.maybeStep(mappedStep).failed) {
            mergedDocMap.appendMap(mappedStep.getMap())
            ;(rebasedMapping as unknown as {setMirror: (a: number, b: number) => void}).setMirror(
                tr.steps.length - stepIndex - 1,
                tr.steps.length + mergedDocMap.maps.length - 1
            )
        }
    }
    // Make sure that all the content steps are present in the new transaction
    if (insertionTr.steps.length < steps.length) {
        showSystemMessage(
            gettext(
                "The change could not be applied automatically. Please consider using the copy option to copy the changes."
            )
        )
    } else {
        dispatchRemoveDiffdata(originalView, from, to)
        merge.mergedDocMap = mergedDocMap
        insertionTr.setMeta("mapAppended", true)
        insertionTr.setMeta("notrack", true)
        mergeView.dispatch(insertionTr)
    }
}

export const removeDecoration = (
    view: EditorView,
    decorationId: string
): void => {
    const tr = view.state.tr
    tr.setMeta("decorationId", decorationId)
    view.dispatch(tr)
}

export const deleteContent = (
    merge: Merge,
    view: EditorView,
    diffMark: Mark,
    mappingNeeded = true
): boolean => {
    // const originalOnlineMapping = merge.onlineTr.mapping
    const rebasedMapping = new Mapping()
    const tr = view.state.tr
    if (mappingNeeded) {
        rebasedMapping.appendMapping(merge.mergedDocMap)
    }
    const rebasedFrom = rebasedMapping.map(diffMark.attrs.from as number),
        rebasedTo = rebasedMapping.map(diffMark.attrs.to as number)
    if (rebasedFrom && rebasedTo) {
        tr.delete(rebasedFrom, rebasedTo)
        merge.mergedDocMap.appendMapping(tr.mapping)
        tr.setMeta("mapAppended", true)
        tr.setMeta("notrack", true)
        view.dispatch(tr)
        return true
    }
    showSystemMessage(
        gettext(
            "The change could not be applied automatically. Please consider using the copy option to copy the changes."
        )
    )
    return false
}

export const addDeletedContentBack = (
    merge: Merge,
    view: EditorView,
    diffMark: Mark
): boolean => {
    const commonDoc = merge.cpDoc
    const tr = view.state.tr
    const slice = commonDoc.slice(
        diffMark.attrs.from as number,
        diffMark.attrs.to as number
    )
    const rebasedMapping = new Mapping()
    rebasedMapping.appendMapping(merge.mergedDocMap)
    const insertionPoint = rebasedMapping.map(diffMark.attrs.from as number)
    if (insertionPoint) {
        tr.insert(insertionPoint, slice.content)
        tr.setMeta("mapAppended", true)
        tr.setMeta("notrack", true)
        view.dispatch(tr)
        merge.mergedDocMap.appendMapping(tr.mapping)
        return true
    }
    showSystemMessage(
        gettext(
            "The change could not be applied automatically. Please consider using the copy option to copy the changes."
        )
    )
    return false
}

export const handleMarks = (
    view: EditorView,
    mark: Mark,
    tr: Transaction,
    schema: Schema
): void => {
    // This function is used to remove the marks that have been applied in the online editor
    const newTr = view.state.tr
    const steps = JSON.parse(mark.attrs.steps as string) as number[]
    const marksToBeRemoved: string[] = [],
        marksToBeAdded: Mark[] = []
    steps.forEach(index => {
        const JSONStep = tr.steps[index].toJSON()
        if (JSONStep.mark && JSONStep.mark.type) {
            if (tr.steps[index] instanceof AddMarkStep) {
                marksToBeRemoved.push(JSONStep.mark.type)
            } else if (tr.steps[index] instanceof RemoveMarkStep) {
                marksToBeAdded.push((tr.steps[index] as RemoveMarkStep).mark)
            }
        }
    })
    marksToBeRemoved.forEach(removalMark =>
        newTr.removeMark(
            mark.attrs.from as number,
            mark.attrs.to as number,
            schema.marks[removalMark]
        )
    )
    marksToBeAdded.forEach(addMark =>
        newTr.addMark(mark.attrs.from as number, mark.attrs.to as number, addMark)
    )
    newTr.setMeta("notrack", true)
    newTr.setMeta("mapAppended", true)
    view.dispatch(newTr)
}
