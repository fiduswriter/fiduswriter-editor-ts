import type {Node as ProseMirrorNode} from "prosemirror-model"
import {
    NodeSelection,
    Plugin,
    PluginKey,
    type EditorState,
    type Selection,
    type Transaction
} from "prosemirror-state"
import {Decoration, DecorationSet, type EditorView} from "prosemirror-view"
import {nextSelection} from "@fiduswriter/common/state_plugins/contributor_input"

import type {Editor} from "../../types.js"
import {ContributorDialog} from "../../dialogs/index.js"
import {ContributorsPartView} from "./node_view.js"
import {createDropUp} from "./dropup.js"

const key = new PluginKey("contributorInput")

interface ContributorInputPluginOptions {
    editor: Editor
}

interface ContributorInputState {
    contributorsPartPositions: Array<{start: number; end: number}>
    decos: DecorationSet
}

interface EditorViewWithEditor extends EditorView {
    editor: any
}

/**
 * Create the contributor input plugin
 */
export const contributorInputPlugin = (
    options: ContributorInputPluginOptions
) =>
    new Plugin<ContributorInputState>({
        key,
        state: {
            init(_config, state: EditorState) {
                const decos = DecorationSet.empty
                if (options.editor.docInfo.access_rights === "write") {
                    ;(this as any).spec.props.nodeViews["contributors_part"] = (
                        node: ProseMirrorNode,
                        view: EditorView,
                        getPos: () => number | undefined
                    ) => new ContributorsPartView(node, view, getPos)
                }

                // Find all contributors_part nodes in document to track their positions
                const contributorsPartPositions: Array<{
                    start: number
                    end: number
                }> = []
                state.doc.descendants((node, pos) => {
                    if (node.type.name === "contributors_part") {
                        contributorsPartPositions.push({
                            start: pos,
                            end: pos + node.nodeSize
                        })
                    }
                })

                return {contributorsPartPositions, decos}
            },
            apply(tr, prev, _oldState, state) {
                let {decos, contributorsPartPositions} = prev
                // If document was modified, update all positions
                if (tr.docChanged) {
                    contributorsPartPositions = contributorsPartPositions.map(
                        range => ({
                            start: tr.mapping.map(range.start),
                            end: tr.mapping.map(range.end)
                        })
                    )
                    decos = decos.map(tr.mapping, tr.doc)
                }
                if (options.editor.docInfo.access_rights !== "write") {
                    return {
                        contributorsPartPositions,
                        decos
                    }
                }
                if (tr.selectionSet) {
                    // Always remove any existing contributor drop-up before adding a new one
                    // This ensures only one drop-up is ever shown at any time
                    const oldDropUpDeco = decos.find(
                        undefined,
                        undefined,
                        spec => (spec as {id?: string}).id === "contributorDropUp"
                    )
                    if (oldDropUpDeco && oldDropUpDeco.length) {
                        decos = decos.remove(oldDropUpDeco)
                    }

                    if (
                        state.selection instanceof NodeSelection &&
                        state.selection.node.type.name === "contributor" &&
                        state.selection.$anchor.node(1).attrs.locking !== "fixed"
                    ) {
                        const dropUpDeco = Decoration.widget(
                            state.selection.from,
                            createDropUp(
                                state.selection,
                                options.editor.view as EditorViewWithEditor
                            ),
                            {
                                side: -1,
                                stopEvent: event => {
                                    // Get drop-up element to check if it exists in DOM
                                    const dropUpEl =
                                        document.querySelector(".drop-up-outer")

                                    if (!dropUpEl) {
                                        // Drop-up not in DOM, let events pass through
                                        return false
                                    }

                                    // Stop mouse events targeting the drop-up
                                    if (
                                        event.type === "mousedown" ||
                                        event.type === "click"
                                    ) {
                                        return !!(
                                            event.target as Element
                                        ).closest(".drop-up-outer")
                                    }

                                    // Stop keyboard events that should be handled by the drop-up
                                    if (event.type === "keydown") {
                                        // Check if event target is within drop-up or if drop-up has focus
                                        const isTargetInDropUp = (
                                            event.target as Element
                                        ).closest(".drop-up-outer")
                                        const dropUpHasFocus =
                                            dropUpEl.contains(
                                                document.activeElement
                                            )

                                        // Keys that should be handled by the drop-up
                                        const keysHandled = [
                                            "ArrowDown",
                                            "ArrowUp",
                                            "Enter",
                                            " ",
                                            "Escape",
                                            "Home",
                                            "End"
                                        ]

                                        // Arrow-Right and Arrow-Left should always pass through for contributor navigation
                                        if (
                                            (event as KeyboardEvent).key === "ArrowRight" ||
                                            (event as KeyboardEvent).key === "ArrowLeft"
                                        ) {
                                            return false
                                        }

                                        // Only stop the event if it's a handled key and either:
                                        // 1. The event target is within the drop-up, or
                                        // 2. The drop-up has focus
                                        if (
                                            keysHandled.includes((event as KeyboardEvent).key) &&
                                            (isTargetInDropUp || dropUpHasFocus)
                                        ) {
                                            return true
                                        }
                                    }
                                    return false
                                },
                                id: "contributorDropUp"
                            }
                        )

                        decos = decos.add(state.doc, [dropUpDeco])
                    }
                }

                return {
                    contributorsPartPositions,
                    decos
                }
            }
        },
        props: {
            nodeViews: {},
            decorations(state: EditorState) {
                const pluginState = key.getState(state) as ContributorInputState | undefined
                if (!pluginState) {
                    return DecorationSet.empty
                }
                const {decos} = pluginState
                return decos
            },
            /**
             * Handle keyboard events
             */
            handleKeyDown(view: EditorView, event: KeyboardEvent) {
                const isContributorSelected =
                    view.state.selection instanceof NodeSelection &&
                    view.state.selection.node.type.name === "contributor"
                const dropUpEl = document.querySelector(".drop-up-options")
                const dropUpHasFocus =
                    dropUpEl && dropUpEl.contains(document.activeElement)

                // If drop-up is focused, let it handle all keyboard events
                if (dropUpHasFocus) {
                    return false
                }

                // Arrow-Up on a selected contributor should focus the drop-up menu
                if (event.key === "ArrowUp" && isContributorSelected) {
                    event.preventDefault()
                    if (dropUpEl) {
                        ;(dropUpEl as HTMLElement).focus()
                    }
                    return true
                }

                // Space key on a selected contributor opens the dialog (when drop-up not focused)
                if (event.key === " " && isContributorSelected) {
                    const idTypes =
                        (view as EditorViewWithEditor).editor.mod
                            .documentTemplate?.currentTemplate?.id_types || []
                    const selection = view.state.selection as NodeSelection
                    const dialog = new ContributorDialog(
                        selection.$anchor.parent,
                        view,
                        selection.node.attrs,
                        idTypes
                    )
                    dialog.init()
                    return true
                }

                // For all other cases, let ProseMirror handle the key
                return false
            }
        },
        /**
         * Append additional transactions based on selection changes
         */
        appendTransaction: (
            trs: readonly Transaction[],
            oldState: EditorState,
            newState: EditorState
        ): Transaction | null | undefined => {
            // If selection is not collapsed or not changed, don't do anything
            if (
                newState.selection.from !== newState.selection.to ||
                !trs.some(tr => tr.selectionSet)
            ) {
                return
            }

            const selectionPos = newState.selection.from
            const pluginState = key.getState(newState) as ContributorInputState

            // Check if selection is within any contributors_part node to handle contributor navigation
            const contributorsPartRange =
                pluginState.contributorsPartPositions.find(
                    range =>
                        selectionPos > range.start && selectionPos < range.end
                )

            if (contributorsPartRange) {
                const oldSelectionPos = oldState.selection.from

                if (selectionPos + 1 === contributorsPartRange.end) {
                    // Selection is at end of contributors_part.
                    // Put caret onto contributor add button if write access is present.
                    // Otherwise, move caret beyond contributors_part.
                    if (options.editor.docInfo.access_rights === "write") {
                        // contributor add button will be activated by node view.
                        return
                    }
                    if (oldSelectionPos < selectionPos) {
                        const newSelection = nextSelection(
                            newState,
                            contributorsPartRange.end,
                            1
                        )
                        if (!newSelection) {
                            // Cannot find a location. Give up.
                            return
                        }

                        return newState.tr.setSelection(newSelection as Selection)
                    }
                }

                const selectedNodePos =
                    oldSelectionPos < selectionPos
                        ? selectionPos
                        : selectionPos - 1

                if (selectedNodePos === contributorsPartRange.start) {
                    // selection is at start of contributors node. Find previous possible selection location.
                    const newSelection = nextSelection(
                        newState,
                        selectedNodePos,
                        -1
                    )
                    if (!newSelection) {
                        // Cannot find a location. Give up.
                        return
                    }
                    return newState.tr.setSelection(newSelection as Selection)
                } else {
                    // Select an entire contributor node
                    return newState.tr.setSelection(
                        NodeSelection.create(newState.doc, selectedNodePos)
                    )
                }
            }

            return null
        }
    })
