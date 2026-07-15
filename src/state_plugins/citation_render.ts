import {Plugin, PluginKey} from "prosemirror-state"
import {ReplaceAroundStep, ReplaceStep} from "prosemirror-transform"

const key = new PluginKey("citationRender")

interface CitationRenderState {
    action: boolean
}

export const citationRenderPlugin = (_options: {editor: unknown}) =>
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
                let {action} = key.getState(oldState) as CitationRenderState

                if (action || tr.getMeta("settings")) {
                    return {action} // We already need to reset the bibliography or another setting is used. Don't bother checking for more reasons to do so.
                }
                tr.steps.forEach((step, index) => {
                    if (
                        step instanceof ReplaceStep ||
                        step instanceof ReplaceAroundStep
                    ) {
                        if (step.from !== step.to) {
                            const map = tr.mapping.maps[index]
                            map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                                tr.doc.nodesBetween(
                                    newStart,
                                    newEnd,
                                    node => {
                                        if (node.type.name === "citation") {
                                            action = true
                                        }
                                    }
                                )
                            })
                        } else {
                            tr.doc.nodesBetween(
                                step.from,
                                step.to,
                                node => {
                                    if (node.type.name === "citation") {
                                        action = true
                                    }
                                }
                            )
                        }
                    }
                })
                return {action}
            }
        }
    })
