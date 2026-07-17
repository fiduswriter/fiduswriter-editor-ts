import {Plugin, PluginKey, type EditorState} from "prosemirror-state"
import {ReplaceAroundStep, ReplaceStep} from "prosemirror-transform"
import type {EditorView} from "prosemirror-view"
import type {Node} from "prosemirror-model"
import type {ModCitations} from "../citations/index.js"

const key = new PluginKey("citationRender")

interface CitationRenderState {
    action: string | false
}

interface CitationRenderOptions {
    editor: {mod: {citations: ModCitations}}
}

export const citationRenderPlugin = (options: CitationRenderOptions) =>
    new Plugin<CitationRenderState>({
        key,
        state: {
            init() {
                return {action: false}
            },
            apply(tr, _prev, oldState, _state) {
                const meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update, return values from meta instead
                    // of previous values
                    return meta as CitationRenderState
                }
                const oldPluginState = key.getState(oldState) as CitationRenderState | undefined
                if (!oldPluginState) {
                    return {action: false}
                }
                let {action} = oldPluginState

                if (action || tr.getMeta("settings")) {
                    return {action} // We already need to reset the bibliography or another setting is used. Don't bother checking for more reasons to do so.
                }
                tr.steps.forEach((step, index) => {
                    if (
                        step instanceof ReplaceStep ||
                        step instanceof ReplaceAroundStep
                    ) {
                        if (step.from !== step.to) {
                            ;(tr.docs[index] as Node).nodesBetween(
                                step.from,
                                step.to,
                                (node: Node) => {
                                    if (node.type.name === "citation") {
                                        // A citation was replaced. We need to reset
                                        action = "reset"
                                    } else if (
                                        !action &&
                                        node.type.name === "footnote"
                                    ) {
                                        action = "numbers"
                                    }
                                }
                            )
                        }
                        if (step.slice?.content) {
                            step.slice.content.descendants((node: Node) => {
                                if (node.type.name === "citation") {
                                    // A citation was added. We need to reset
                                    action = "reset"
                                } else if (
                                    !action &&
                                    node.type.name === "footnote"
                                ) {
                                    action = "numbers"
                                }
                            })
                        }
                    }
                })
                return {action}
            }
        },
        view(_view: EditorView): {update: (view: EditorView, prevState: EditorState) => void; destroy: () => void} {
            options.editor.mod.citations.resetCitations()
            return {
                update: (view: EditorView, _prevState: EditorState) => {
                    const stateAction = key.getState(view.state) as CitationRenderState | undefined
                    const action = stateAction?.action
                    if (action === "reset") {
                        options.editor.mod.citations.resetCitations()
                        const tr = view.state.tr.setMeta(key, {action: false})
                        view.dispatch(tr)
                    } else if (action === "numbers") {
                        options.editor.mod.citations.footnoteNumberOverride()
                        const tr = view.state.tr.setMeta(key, {action: false})
                        view.dispatch(tr)
                    } else if (view.dom.querySelector(".citation:empty")) {
                        options.editor.mod.citations.resetCitations()
                    }
                },
                destroy: () => {
                    options.editor.mod.citations.resetCitations()
                }
            }
        }
    })
