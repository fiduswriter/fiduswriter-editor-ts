// Random but schema-valid edit generation, shared by the harnesses.
//
// Edits are built as real ProseMirror transactions against a real state.
// Invalid constructions are retried; a returned transaction's resulting doc
// is checked with doc.check() so that harnesses can treat "the editor
// reached an invalid doc" as a failure of the code under test rather than
// of the generator.

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {TextSelection} from "prosemirror-state"

import {makeRng, randomText} from "./doc-generator.js"

function filledNode(rng) {
    switch (rng.int(0, 3)) {
        case 0:
            return docSchema.nodes.paragraph.createAndFill()
        case 1:
            return docSchema.nodes["heading" + rng.int(1, 6)].createAndFill()
        case 2:
            return docSchema.nodes.code_block.createAndFill()
        case 3:
            return docSchema.nodes.blockquote.createAndFill(null, [
                docSchema.nodes.paragraph.createAndFill()
            ])
    }
}

// Attempts up to `attempts` random edits and returns a {tr, label} for the
// first one that produces a check-valid resulting doc, or null.
// `bounds` optionally restricts positions to a [from, to) doc range (used to
// keep each simulated client's edits inside its own document part).
export function randomEdit(state, seed, {attempts = 6, bounds = null} = {}) {
    const rng = makeRng(seed)
    const lo = bounds ? bounds.from : 0
    const hi = bounds ? bounds.to : state.doc.content.size
    for (let i = 0; i < attempts; i++) {
        const tr = state.tr
        const from = rng.int(lo, Math.max(lo, hi - 1))
        const to = Math.min(hi, from + rng.int(0, 6))
        let label
        try {
            switch (rng.int(0, 4)) {
                case 0:
                    tr.delete(from, to)
                    label = `delete(${from},${to})`
                    break
                case 1: {
                    const text = randomText(rng) || "x"
                    tr.insertText(text, from, from)
                    label = `insertText(${from})`
                    break
                }
                case 2: {
                    const node = filledNode(rng)
                    if (!node) {
                        continue
                    }
                    tr.replaceWith(from, to, node)
                    label = `replaceWith(${from},${to},${node.type.name})`
                    break
                }
                case 3:
                    tr.split(from)
                    label = `split(${from})`
                    break
                case 4: {
                    // join at a block boundary if possible
                    const $from = state.doc.resolve(from)
                    if ($from.parentOffset !== 0 || !$from.nodeBefore) {
                        continue
                    }
                    tr.join(from - 1)
                    label = `join(${from - 1})`
                    break
                }
            }
        } catch (_error) {
            // construction invalid (e.g. text at a non-text position) — retry
            continue
        }
        if (!tr.steps.length) {
            continue
        }
        try {
            tr.doc.check()
        } catch (_error) {
            continue
        }
        return {tr, label}
    }
    return null
}

// Apply an edit through a fake editor's view and return the new state.
export function dispatchEdit(editor, seed, options) {
    const edit = randomEdit(editor.view.state, seed, options)
    if (!edit) {
        return false
    }
    try {
        editor.view.dispatch(edit.tr)
    } catch (error) {
        error.message = `dispatch of ${edit.label} threw: ${error.message}`
        throw error
    }
    return edit.label
}

export {TextSelection}
