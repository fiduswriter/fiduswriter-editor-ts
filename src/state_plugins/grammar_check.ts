/**
 * ProseMirror state plugin rendering spell/grammar checker matches as
 * inline decorations, registered in both the main and the footnote
 * editor. Ported from the old languagetool plugin's state plugin, with
 * the decoration classes kept (`spelling`, `grammar`, `language`).
 *
 * Meta actions: `setDecorations` (add matches), `removeDecorations`,
 * `removeDecorationsBetween`. Decorations are cleared when the document
 * language changes and, in continuous checking mode, on every document
 * change (offsets are stale as soon as the document changes); otherwise
 * they are mapped through transactions like the old plugin.
 */

import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import type {EditorState, Transaction} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import type {EditorView} from "prosemirror-view"

import {DialogGrammar} from "../grammar/dialog.js"
import {matchClass, type GrammarMatchPM} from "../grammar/matches.js"
import {WRITE_ROLES} from "../types.js"

const key = new PluginKey("grammarCheck")

export interface GrammarCheckState {
    decos: DecorationSet
    matches: GrammarMatchPM[]
}

export const setDecorations = function (
    state: EditorState,
    newMatches: GrammarMatchPM[]
): Transaction {
    const keyState = key.getState(state) as GrammarCheckState,
        matches = keyState.matches
    let decos = keyState.decos

    newMatches.forEach((match, index) => {
        const deco = Decoration.inline(
            match.from,
            match.to,
            {
                class: matchClass(match)
            },
            {id: index + matches.length}
        )
        decos = decos.add(state.doc, [deco])
    })

    return state.tr.setMeta(key, {decos, matches: matches.concat(newMatches)})
}

export const removeDecorations = function (
    state: EditorState
): Transaction | undefined {
    const {decos} = key.getState(state) as GrammarCheckState

    if (decos.find().length === 0) {
        return
    }
    return state.tr.setMeta(key, {
        decos: DecorationSet.empty,
        matches: []
    })
}

export const removeDecorationsBetween = function (
    state: EditorState,
    from: number,
    to: number
): Transaction | undefined {
    const keyState = key.getState(state) as GrammarCheckState,
        matches = keyState.matches
    let decos = keyState.decos

    decos = decos.remove(decos.find(from, to))
    return state.tr.setMeta(key, {decos, matches})
}

interface GrammarCheckOptions {
    editor: any
}

export const grammarCheckPlugin = function (options: GrammarCheckOptions) {
    return new Plugin({
        key,
        state: {
            init() {
                return {
                    decos: DecorationSet.empty,
                    matches: []
                }
            },
            apply(tr, _prev, oldState, state) {
                if (
                    oldState.doc.attrs?.language &&
                    oldState.doc.attrs?.language !== state.doc.attrs?.language
                ) {                    // Language has changed, remove all decorations in both
                    // the main and the footnote editor.
                    options.editor.mod.grammar?.onLanguageChange()
                    return {
                        decos: DecorationSet.empty,
                        matches: []
                    }
                }

                const meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update, return values from meta
                    // instead of previous values
                    return meta
                }
                const keyState = key.getState(oldState) as GrammarCheckState,
                    matches = keyState.matches
                let decos = keyState.decos

                if (tr.docChanged && options.editor.mod.grammar?.continuous) {
                    // Continuous checking re-checks the document after
                    // every change; old offsets are stale.
                    return {
                        decos: DecorationSet.empty,
                        matches: []
                    }
                }

                decos = decos.map(tr.mapping, tr.doc)

                return {
                    decos,
                    matches
                }
            }
        },
        props: {
            decorations(state: EditorState) {
                const {decos} = this.getState(state) as GrammarCheckState
                return decos
            },
            attributes() {
                // The checker's own underlines replace the browser's native
                // spellcheck underlines.
                return {spellcheck: "false"}
            },
            handleDOMEvents: {
                contextmenu(view: EditorView, event: MouseEvent) {
                    const editor = options.editor
                    if (
                        !(WRITE_ROLES as string[]).includes(
                            editor.docInfo.access_rights as string
                        )
                    ) {
                        return false
                    }
                    const coords = view.posAtCoords({
                        left: event.clientX,
                        top: event.clientY
                    })
                    if (!coords) {
                        return false
                    }
                    const pos = coords.pos
                    const {decos, matches} = this.getState(
                        view.state
                    ) as GrammarCheckState
                    const deco = decos.find(pos, pos)[0]
                    if (!deco) {
                        return false
                    }
                    const match = matches[deco.spec.id]
                    if (!match) {
                        return false
                    }
                    const transaction = view.state.tr.setSelection(
                        TextSelection.create(
                            view.state.doc,
                            deco.from,
                            deco.to
                        )
                    )
                    view.dispatch(transaction)

                    const dialog = new DialogGrammar(editor, view, match)
                    dialog.init()
                    event.preventDefault()
                    return true
                }
            }
        },
        view(_view: EditorView) {
            return {
                update: (view, prevState) => {
                    if (prevState.doc !== view.state.doc) {
                        options.editor.mod.grammar?.onDocChanged()
                    }
                }
            }
        }
    })
}
