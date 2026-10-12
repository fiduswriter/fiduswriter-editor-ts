// Fuzz harness for track-changes accept/reject: random tracked documents,
// random accept/reject sequences (single changes and global accept/reject
// all), including block-level track entries (figure deletions, block
// changes).
//
// Invariants:
//  1. No accept/reject call throws.
//  2. Every resulting document passes doc.check().
//  3. After acceptAll: no open deletion/format_change marks remain and no
//     block track entries remain; insertion marks are approved.
//  4. After rejectAll: no open track marks and no block track entries
//     remain; the text of unapproved insertions is gone (rejection of own
//     insertions removes them outright).

import "../setup.js"

import {acceptAll} from "../../dist/track/accept_all.js"
import {rejectAll} from "../../dist/track/reject_all.js"
import {accept} from "../../dist/track/accept.js"
import {reject} from "../../dist/track/reject.js"
import {trackedTransaction} from "../../dist/track/index.js"

import {fc, runHarness} from "./config.js"
import {docArb, makeRng} from "./doc-generator.js"
import {randomEdit} from "./edits.js"
import {EditorState} from "prosemirror-state"

const USER = {id: 1, username: "fuzz_user"}
const DATE = 1755000000000

function makeView(state) {
    const view = {state}
    view.dispatch = tr => {
        view.state = view.state.apply(tr)
    }
    return view
}

// Produce a tracked document: random base doc, then a series of edits
// applied through trackedTransaction (the production tracking wrapper).
function trackedDoc(fcArb, baseSeed, editCount) {
    const {doc: baseDoc} = fc.sample(docArb(fcArb), {
        seed: baseSeed,
        numRuns: 1
    })[0]
    let state = EditorState.create({doc: baseDoc})
    const rng = makeRng(baseSeed ^ (editCount * 5381))
    let applied = 0
    for (let i = 0; i < editCount; i++) {
        const edit = randomEdit(state, rng.int(1, 2 ** 31 - 1))
        if (!edit) {
            continue
        }
        const tracked = trackedTransaction(edit.tr, state, USER, false, DATE)
        state = state.apply(tracked)
        applied++
    }
    if (applied === 0) {
        return null
    }
    return state
}

function collectChanges(doc) {
    const inline = []
    doc.descendants((node, pos) => {
        node.marks.forEach(mark => {
            if (mark.type.name === "deletion") {
                inline.push({type: "deletion", pos})
            } else if (mark.type.name === "format_change") {
                inline.push({type: "format_change", pos})
            } else if (
                mark.type.name === "insertion" &&
                mark.attrs.approved === false
            ) {
                inline.push({type: "insertion", pos})
            }
        })
        if (Array.isArray(node.attrs.track) && node.attrs.track.length) {
            node.attrs.track.forEach(track => {
                inline.push({type: track.type, pos})
            })
        }
    })
    return inline
}

function assertClean(view, context) {
    try {
        view.state.doc.check()
    } catch (error) {
        error.message = `invalid doc after ${context}: ${error.message}`
        throw error
    }
    let leftover = []
    view.state.doc.descendants(node => {
        node.marks.forEach(mark => {
            if (
                ["deletion", "format_change"].includes(mark.type.name) ||
                (mark.type.name === "insertion" &&
                    mark.attrs.approved === false)
            ) {
                leftover.push(mark.type.name)
            }
        })
        if (Array.isArray(node.attrs.track) && node.attrs.track.length) {
            leftover.push("block track on " + node.type.name)
        }
    })
    if (leftover.length) {
        throw new Error(
            `open track changes after ${context}: ${[...new Set(leftover)].join(", ")}`
        )
    }
}

// --- Property 1: acceptAll over a random tracked document -------------------

const acceptAllProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 4}),
    (baseSeed, editCount) => {
        const state = trackedDoc(fc, baseSeed, editCount)
        if (!state) {
            return
        }
        const view = makeView(state)
        try {
            acceptAll(view)
        } catch (error) {
            error.message = `acceptAll threw on a tracked doc with ${collectChanges(state.doc).length} changes: ${error.message}`
            throw error
        }
        assertClean(view, "acceptAll")
    }
)

// --- Property 2: rejectAll over a random tracked document -------------------

const rejectAllProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 4}),
    (baseSeed, editCount) => {
        const state = trackedDoc(fc, baseSeed, editCount)
        if (!state) {
            return
        }
        const view = makeView(state)
        try {
            rejectAll(view)
        } catch (error) {
            error.message = `rejectAll threw: ${error.message}`
            throw error
        }
        assertClean(view, "rejectAll")
    }
)

// --- Property 3: random single accept/reject interleavings, then global ----

const mixedProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 4}),
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    (baseSeed, editCount, actionSeed) => {
        const state = trackedDoc(fc, baseSeed, editCount)
        if (!state) {
            return
        }
        const rng = makeRng(actionSeed)
        const view = makeView(state)
        for (let round = 0; round < 6; round++) {
            const changes = collectChanges(view.state.doc)
            if (!changes.length) {
                break
            }
            const change = changes[rng.int(0, changes.length - 1)]
            const doAccept = rng.bool()
            try {
                if (doAccept) {
                    accept(change.type, change.pos, view)
                } else {
                    reject(change.type, change.pos, view)
                }
            } catch (error) {
                error.message = `${doAccept ? "accept" : "reject"}(${change.type}, ${change.pos}) threw after ${round} rounds: ${error.message}`
                throw error
            }
            try {
                view.state.doc.check()
            } catch (error) {
                error.message = `invalid doc after ${doAccept ? "accept" : "reject"}(${change.type}, ${change.pos}): ${error.message}`
                throw error
            }
        }
        // Finish with a global pass: both must leave the doc clean.
        try {
            acceptAll(view)
        } catch (error) {
            error.message = `acceptAll after mixed actions threw: ${error.message}`
            throw error
        }
        assertClean(view, "mixed actions + acceptAll")
    }
)

runHarness("track-accept-reject", [
    {label: "acceptAll over random tracked docs", prop: acceptAllProp},
    {label: "rejectAll over random tracked docs", prop: rejectAllProp},
    {
        label: "mixed single accept/reject then acceptAll",
        prop: mixedProp
    }
])
