import {findTarget} from "fwtoolkit"
import type {EditorView} from "prosemirror-view"

import {
    deactivateAllSelectedChanges,
    setSelectedChanges
} from "../state_plugins/track/index.js"
import type {Editor} from "../types.js"

import {accept} from "./accept.js"
import {acceptAll} from "./accept_all.js"
import {reject} from "./reject.js"
import {rejectAll} from "./reject_all.js"

interface MarginBox {
    view: string
    type: string
    pos: number
}

// Helper functions related to tracked changes
export class ModTrack {
    editor: Editor

    constructor(editor: Editor) {
        editor.mod.track = this
        this.editor = editor
        this.bindEvents()
    }

    bindEvents(): void {
        // Bind all the click events related to track changes
        document.body.addEventListener("click", event => {
            const el: {target?: HTMLElement} = {}
            switch (true) {
                case findTarget(event, ".track-accept", el): {
                    let boxNumber = 0
                    let seekItem = el.target?.closest(".margin-box")
                    while (seekItem?.previousElementSibling) {
                        boxNumber += 1
                        seekItem = seekItem.previousElementSibling as HTMLElement
                    }
                    const box = (
                        this.editor.mod.marginboxes as {marginBoxes: MarginBox[]}
                    ).marginBoxes[boxNumber]
                    accept(
                        (el.target as HTMLElement).dataset.type as string,
                        box.pos,
                        box.view === "main"
                            ? this.editor.view
                            : (this.editor.mod.footnotes as {fnEditor: {view: EditorView}}).fnEditor.view
                    )
                    // Activate the next margin box with the same number
                    const newBox = (
                        this.editor.mod.marginboxes as {marginBoxes: MarginBox[]}
                    ).marginBoxes[boxNumber]
                    if (newBox) {
                        ;(this.editor.mod.track as ModTrack).activateTrack(
                            newBox.view,
                            newBox.type,
                            newBox.pos
                        )
                    }
                    break
                }
                case findTarget(event, ".track-reject", el): {
                    let boxNumber = 0
                    let seekItem = el.target?.closest(".margin-box")
                    while (seekItem?.previousElementSibling) {
                        boxNumber += 1
                        seekItem = seekItem.previousElementSibling as HTMLElement
                    }
                    const box = (
                        this.editor.mod.marginboxes as {marginBoxes: MarginBox[]}
                    ).marginBoxes[boxNumber]
                    reject(
                        (el.target as HTMLElement).dataset.type as string,
                        box.pos,
                        box.view === "main"
                            ? this.editor.view
                            : (this.editor.mod.footnotes as {fnEditor: {view: EditorView}}).fnEditor.view
                    )
                    // Activate the next margin box with the same number
                    const newBox = (
                        this.editor.mod.marginboxes as {marginBoxes: MarginBox[]}
                    ).marginBoxes[boxNumber]
                    if (newBox) {
                        ;(this.editor.mod.track as ModTrack).activateTrack(
                            newBox.view,
                            newBox.type,
                            newBox.pos
                        )
                    }
                    break
                }
                default:
                    break
            }
        })
    }

    activateTrack(viewName: string, type: string, pos: number): void {
        ;(
            this.editor.mod.comments as {
                interactions: {deactivateAll: () => void}
            }
        ).interactions.deactivateAll()
        const view =
            viewName === "main"
                ? this.editor.view
                : (this.editor.mod.footnotes as {fnEditor: {view: EditorView}}).fnEditor.view
        const otherView =
            viewName === "main"
                ? (this.editor.mod.footnotes as {fnEditor: {view: EditorView}}).fnEditor.view
                : this.editor.view
        // remove all selected changes in other view
        otherView.dispatch(deactivateAllSelectedChanges(otherView.state.tr))
        // activate selected change in relevant view
        const tr = setSelectedChanges(view.state, type, pos)
        if (tr) {
            this.editor.currentView = view
            view.dispatch(tr)
        }
    }

    rejectAll(): void {
        rejectAll((this.editor.mod.footnotes as {fnEditor: {view: EditorView}}).fnEditor.view)
        rejectAll(this.editor.view)
    }

    acceptAll(): void {
        acceptAll((this.editor.mod.footnotes as {fnEditor: {view: EditorView}}).fnEditor.view)
        acceptAll(this.editor.view)
    }
}
