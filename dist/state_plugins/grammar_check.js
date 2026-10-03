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
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { DialogGrammar } from "../grammar/dialog.js";
import { matchClass } from "../grammar/matches.js";
import { WRITE_ROLES } from "../types.js";
const key = new PluginKey("grammarCheck");
export const setDecorations = function (state, newMatches) {
    const keyState = key.getState(state), matches = keyState.matches;
    let decos = keyState.decos;
    newMatches.forEach((match, index) => {
        const deco = Decoration.inline(match.from, match.to, {
            class: matchClass(match)
        }, { id: index + matches.length });
        decos = decos.add(state.doc, [deco]);
    });
    return state.tr.setMeta(key, { decos, matches: matches.concat(newMatches) });
};
export const removeDecorations = function (state) {
    const { decos } = key.getState(state);
    if (decos.find().length === 0) {
        return;
    }
    return state.tr.setMeta(key, {
        decos: DecorationSet.empty,
        matches: []
    });
};
export const removeDecorationsBetween = function (state, from, to) {
    const keyState = key.getState(state), matches = keyState.matches;
    let decos = keyState.decos;
    decos = decos.remove(decos.find(from, to));
    return state.tr.setMeta(key, { decos, matches });
};
export const grammarCheckPlugin = function (options) {
    return new Plugin({
        key,
        state: {
            init() {
                return {
                    decos: DecorationSet.empty,
                    matches: []
                };
            },
            apply(tr, _prev, oldState, state) {
                if (oldState.doc.attrs?.language &&
                    oldState.doc.attrs?.language !== state.doc.attrs?.language) {
                    // Language has changed, remove all decorations in both
                    // the main and the footnote editor.
                    options.editor.mod.grammar?.onLanguageChange();
                    return {
                        decos: DecorationSet.empty,
                        matches: []
                    };
                }
                const meta = tr.getMeta(key);
                if (meta) {
                    // There has been an update, return values from meta
                    // instead of previous values
                    return meta;
                }
                const keyState = key.getState(oldState), matches = keyState.matches;
                let decos = keyState.decos;
                if (tr.docChanged && options.editor.mod.grammar?.continuous) {
                    // Continuous checking re-checks the document after
                    // every change; old offsets are stale.
                    return {
                        decos: DecorationSet.empty,
                        matches: []
                    };
                }
                decos = decos.map(tr.mapping, tr.doc);
                return {
                    decos,
                    matches
                };
            }
        },
        props: {
            decorations(state) {
                const { decos } = this.getState(state);
                return decos;
            },
            attributes() {
                // The checker's own underlines replace the browser's native
                // spellcheck underlines.
                return { spellcheck: "false" };
            },
            handleDOMEvents: {
                contextmenu(view, event) {
                    const editor = options.editor;
                    if (!WRITE_ROLES.includes(editor.docInfo.access_rights)) {
                        return false;
                    }
                    const coords = view.posAtCoords({
                        left: event.clientX,
                        top: event.clientY
                    });
                    if (!coords) {
                        return false;
                    }
                    const pos = coords.pos;
                    const { decos, matches } = this.getState(view.state);
                    const deco = decos.find(pos, pos)[0];
                    if (!deco) {
                        return false;
                    }
                    const match = matches[deco.spec.id];
                    if (!match) {
                        return false;
                    }
                    const transaction = view.state.tr.setSelection(TextSelection.create(view.state.doc, deco.from, deco.to));
                    view.dispatch(transaction);
                    const dialog = new DialogGrammar(editor, view, match);
                    dialog.init();
                    event.preventDefault();
                    return true;
                }
            }
        },
        view(_view) {
            // The editor starts with an empty state and the document
            // arrives later as a brand-new state (see collab/doc.ts), so
            // `update` below never fires for the initial document — only
            // for later edits. The plugin view is created exactly when
            // the document-carrying state is installed, so kick the
            // checker here: with continuous checking on, the first check
            // runs without any user edit.
            options.editor.mod.grammar?.onDocChanged();
            return {
                update: (view, prevState) => {
                    if (prevState.doc !== view.state.doc) {
                        options.editor.mod.grammar?.onDocChanged();
                    }
                }
            };
        }
    });
};
//# sourceMappingURL=grammar_check.js.map