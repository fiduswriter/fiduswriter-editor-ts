import type {Node} from "prosemirror-model"
import {Plugin, PluginKey, type EditorState, type Transaction} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import type {EditorView} from "prosemirror-view"

const key = new PluginKey("search")

interface StringObject {
    parent: Node
    pos: Array<[number, number]>
    text: string
}

export interface Match {
    from: number
    to: number
}

function findMatches(doc: Node, term: string): Match[] {
    let stringObj: StringObject | false = false,
        matches: Match[] = []

    if (!term.length) {
        return matches
    }

    doc.descendants((node, pos, parent) => {
        if (
            !node.isInline ||
            node.marks.find(mark => mark.type.name === "deletion")
        ) {
            return
        }
        if (
            stringObj &&
            (parent !== stringObj.parent || !node.isText)
        ) {
            matches = matches.concat(findTerm(term, stringObj))
            stringObj = false
        }

        if (node.isText) {
            if (!stringObj) {
                stringObj = {parent: parent!, pos: [], text: ""}
            }
            const textNode = node.text!
            stringObj.text += textNode
            stringObj.pos.push([pos, pos + textNode.length])
        }
    })
    if (stringObj) {
        matches = matches.concat(findTerm(term, stringObj))
    }
    return matches
}

// Find search term within stringObjects (strings that consist of several text nodes that hang together)
function findTerm(term: string, stringObj: StringObject): Match[] {
    const matches: Match[] = []
    let index = 0,
        foundIndex: number
    while ((foundIndex = stringObj.text.indexOf(term, index)) !== -1) {
        index = foundIndex + term.length

        matches.push({
            from: transPos(foundIndex, stringObj.pos),
            to: transPos(foundIndex + term.length, stringObj.pos)
        })
    }
    return matches
}

// Translate the start and end position of the serach term within the strings to document positions
function transPos(index: number, pos: Array<[number, number]>): number {
    let findIndex = index,
        posIndex = 0
    while (findIndex > pos[posIndex][1] - pos[posIndex][0]) {
        findIndex -= pos[posIndex][1] - pos[posIndex][0]
        posIndex++
    }
    return pos[posIndex][0] + findIndex
}

function matchesToDecos(
    doc: Node,
    matches: Match[],
    selected: number | false
): DecorationSet {
    if (!matches.length) {
        return DecorationSet.empty
    }
    const decorations = matches.map((match, index) => {
        return Decoration.inline(match.from, match.to, {
            class: `search${index === selected ? " selected" : ""}`
        })
    })
    return DecorationSet.create(doc, decorations)
}

interface SearchListener {
    onUpdate(): void
}

export const setSearchTerm = (
    state: EditorState,
    term: string,
    selected: number | false = false,
    listener: SearchListener | false = false
): {tr: Transaction; matches: Match[]; selected: number | false} => {
    const matches = findMatches(state.doc, term),
        decos = matchesToDecos(state.doc, matches, selected)

    selected =
        selected !== false && matches.length > selected
            ? selected
            : matches.length
              ? matches.length - 1
              : false

    const tr = state.tr.setMeta(key, {
        term,
        decos,
        matches,
        selected,
        listener
    })

    return {tr, matches, selected}
}

export const endSearch = (state: EditorState): Transaction =>
    state.tr.setMeta(key, {
        term: "",
        decos: DecorationSet.empty,
        matches: [],
        selected: 0,
        listener: false
    })

export const selectNextSearchMatch = (state: EditorState): Transaction => {
    const pluginState = key.getState(state) as {
        term: string
        matches: Match[]
        listener: SearchListener | false
        selected: number | false
    }
    let {selected} = pluginState

    if (selected === false) {
        selected = pluginState.matches.length
    }
    if (selected < pluginState.matches.length - 1) {
        selected++
    } else {
        selected = 0
    }
    const decos = matchesToDecos(
        state.doc,
        pluginState.matches,
        selected
    )
    return state.tr.setMeta(key, {
        term: pluginState.term,
        decos,
        matches: pluginState.matches,
        selected,
        listener: pluginState.listener
    })
}

export const selectPreviousSearchMatch = (state: EditorState): Transaction => {
    const pluginState = key.getState(state) as {
        term: string
        matches: Match[]
        listener: SearchListener | false
        selected: number | false
    }
    let {selected} = pluginState

    if (selected === false) {
        selected = 0
    }
    if (selected > 0) {
        selected--
    } else {
        selected = pluginState.matches.length - 1
    }
    const decos = matchesToDecos(
        state.doc,
        pluginState.matches,
        selected
    )
    return state.tr.setMeta(key, {
        term: pluginState.term,
        decos,
        matches: pluginState.matches,
        selected,
        listener: pluginState.listener
    })
}

export const deselectSearchMatch = (state: EditorState): Transaction => {
    const {term, matches, listener} = key.getState(state) as {
        term: string
        matches: Match[]
        listener: SearchListener | false
    }
    const selected = false,
        decos = matchesToDecos(state.doc, matches, selected)
    return state.tr.setMeta(key, {
        term,
        decos,
        matches,
        selected,
        listener
    })
}

export const getSearchMatches = (
    state: EditorState
): {matches: Match[]; selected: number | false} => {
    const {matches, selected} = key.getState(state) as {
        matches: Match[]
        selected: number | false
    }
    return {matches, selected}
}

interface SearchPluginOptions {
    editor: any
}

export const searchPlugin = (_options: SearchPluginOptions) =>
    new Plugin({
        key,
        state: {
            init() {
                return {
                    term: "",
                    decos: DecorationSet.empty,
                    matches: [],
                    selected: 0,
                    listener: false
                }
            },
            apply(tr, _prev, oldState, state) {
                const meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update, return values from meta instead
                    // of previous values
                    return meta
                }

                const pluginState = key.getState(oldState) as {
                    term: string
                    listener: SearchListener | false
                    matches: Match[]
                    decos: DecorationSet
                    selected: number | false
                }
                const {term, listener} = pluginState
                let {matches, decos, selected} = pluginState

                if (term === "" || !tr.docChanged) {
                    return {
                        term,
                        decos, // empty if term === ''
                        matches, // empty if term === ''
                        selected, // 0 if term === ''
                        listener // false is dialog not open
                    }
                }

                // The document is changing while the search window is open. We redo the search for the entire doc.
                // TODO: Optimize for speed by only recalculating the part of the doc that was changed.
                matches = findMatches(state.doc, term)
                if (selected !== false && selected >= matches.length) {
                    if (matches.length) {
                        selected = matches.length - 1
                    } else {
                        selected = false
                    }
                }
                decos = matchesToDecos(state.doc, matches, selected)

                return {
                    term,
                    decos,
                    matches,
                    selected,
                    listener
                }
            }
        },
        props: {
            decorations(state: EditorState) {
                const {decos} = key.getState(state) as {decos: DecorationSet}
                return decos
            }
        },
        view(_view: EditorView) {
            return {
                update: (view, _prevState) => {
                    const {listener} = key.getState(view.state) as {
                        listener: SearchListener | false
                    }
                    if (listener) {
                        listener.onUpdate()
                    }
                }
            }
        }
    })
