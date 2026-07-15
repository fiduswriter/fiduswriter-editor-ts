import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import type {EditorState} from "prosemirror-state"

const key = new PluginKey("placeholders")

export const placeholdersPlugin = (_options: {editor: unknown}) => {
    function calculatePlaceHolderDecorations(state: EditorState) {
        const anchor = state.selection.$anchor
        const head = state.selection.$head
        if (!anchor || !head) {
            return
        }
        const anchorPart = anchor.node(1)
        const headPart = head.node(1)
        if (!anchorPart || !headPart) {
            return
        }
        const currentPart = anchorPart === headPart ? anchorPart : false

        const decorations: Array<ReturnType<typeof Decoration.widget>> = []

        state.doc.forEach((partElement, offset) => {
            if (
                (partElement.isTextblock && partElement.childCount === 0) ||
                (!partElement.isTextblock && partElement.nodeSize === 4)
            ) {
                if (
                    [
                        state.schema.nodes["tags_part"],
                        state.schema.nodes["contributors_part"]
                    ].includes(partElement.type) &&
                    partElement !== currentPart
                ) {
                    return
                }

                const placeholder = document.createElement("span")
                placeholder.classList.add("placeholder")
                placeholder.setAttribute("data-placeholder", "true")
                const widget = Decoration.widget(
                    offset + 1,
                    () => placeholder,
                    {
                        side: -1,
                        placeholder: true
                    }
                )
                decorations.push(widget)
            }
        })
        return DecorationSet.create(state.doc, decorations)
    }

    return new Plugin({
        key,
        state: {
            init(_config, state) {
                return calculatePlaceHolderDecorations(state)
            },
            apply(_tr, value, oldState, newState) {
                if (
                    _tr.docChanged ||
                    oldState.selection.$anchor !== newState.selection.$anchor ||
                    oldState.selection.$head !== newState.selection.$head
                ) {
                    return calculatePlaceHolderDecorations(newState)
                }
                return value
            }
        },
        props: {
            decorations(state) {
                return key.getState(state)
            }
        }
    })
}
