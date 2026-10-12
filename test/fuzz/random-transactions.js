// Fuzz harness for the local editing pipeline: random edit transactions run
// through the production dispatch path (amendTransaction → trackedTransaction
// → plugins) against real EditorViews.
//
// Invariants:
//  1. Every document the editor reaches passes doc.check().
//  2. Every comment mark in the doc has an entry in the comment store and
//     vice versa (after registration at load, mirroring comment import).
//  3. Track marks stay well-formed: user/username/date present.
//  4. History (undo/redo) works after arbitrary tracked edits.

import "../setup.js"

import {ModCollabDoc} from "../../dist/collab/doc.js"
import {amendTransaction} from "../../dist/track/index.js"
import {undo, redo} from "prosemirror-history"

import {fc, runHarness} from "./config.js"
import {docArb, makeRng} from "./doc-generator.js"
import {
    makeFakeEditor,
    destroyFakeEditor,
    attachCollabDoc
} from "./fake-editor.js"
import {randomEdit} from "./edits.js"

// Register every comment mark id of the doc in the store — the state a real
// editor reaches after loading a document with comments (import-comments).
function registerComments(editor, doc) {
    doc.descendants(node => {
        const commentMark = node.marks.find(
            mark => mark.type.name === "comment"
        )
        if (commentMark && commentMark.attrs.id) {
            editor.mod.comments.store.addLocalComment(
                {
                    id: commentMark.attrs.id,
                    comment: "fuzz comment",
                    user: 2,
                    username: "user2",
                    date: 1755000000000,
                    answers: [],
                    resolved: false
                },
                false
            )
        }
    })
}

function collectCommentMarkIds(doc) {
    const ids = new Set()
    doc.descendants(node => {
        node.marks.forEach(mark => {
            if (mark.type.name === "comment" && mark.attrs.id) {
                ids.add(String(mark.attrs.id))
            }
        })
    })
    return ids
}

function verifyInvariants(editor, context) {
    const state = editor.view.state
    try {
        state.doc.check()
    } catch (error) {
        error.message = `invalid doc after ${context}: ${error.message}`
        throw error
    }
    // Comment marks ↔ store consistency.
    const markIds = collectCommentMarkIds(state.doc)
    const storeIds = new Set(
        Object.keys(editor.mod.comments.store.comments).map(String)
    )
    for (const id of markIds) {
        if (!storeIds.has(id)) {
            throw new Error(
                `comment mark ${id} in doc after ${context} but missing from store (store has: ${[...storeIds].join(", ") || "none"})`
            )
        }
    }
    // Track marks well-formed.
    let trackError = null
    state.doc.descendants(node => {
        node.marks.forEach(mark => {
            if (
                ["insertion", "deletion", "format_change"].includes(
                    mark.type.name
                ) &&
                (mark.attrs.user === undefined ||
                    mark.attrs.username === undefined ||
                    mark.attrs.date === undefined)
            ) {
                trackError = `malformed ${mark.type.name} mark: ${JSON.stringify(mark.attrs)}`
            }
        })
    })
    if (trackError) {
        throw new Error(trackError)
    }
}

// Dispatch through the production path: amendTransaction wraps plain input
// transactions with track marks, exactly like Editor.dispatchTransaction.
function dispatchThroughProductionPath(editor, tr) {
    const amended = amendTransaction(tr, editor.view.state, editor)
    editor.view.dispatch(amended)
}

const trackedEditsProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 2, max: 6}),
    (baseSeed, editCount) => {
        const {doc: baseDoc} = fc.sample(docArb(fc), {
            seed: baseSeed,
            numRuns: 1
        })[0]
        const editor = makeFakeEditor({doc: baseDoc, clientID: "tx-client"})
        const mod = {editor}
        const collabDoc = new ModCollabDoc(mod)
        attachCollabDoc(editor, collabDoc)
        try {
            registerComments(editor, baseDoc)
            const rng = makeRng(baseSeed ^ editCount)
            for (let i = 0; i < editCount; i++) {
                const state = editor.view.state
                const edit = randomEdit(state, rng.int(1, 2 ** 31 - 1))
                if (!edit) {
                    continue
                }
                try {
                    dispatchThroughProductionPath(editor, edit.tr)
                } catch (error) {
                    error.message = `tracked dispatch of ${edit.label} threw: ${error.message}`
                    throw error
                }
                verifyInvariants(editor, `tracked edit ${i} (${edit.label})`)
            }
        } finally {
            destroyFakeEditor(editor)
        }
    }
)

const undoRedoProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 2, max: 5}),
    (baseSeed, editCount) => {
        const {doc: baseDoc} = fc.sample(
            docArb(fc, {track: false, annotations: false}),
            {seed: baseSeed, numRuns: 1}
        )[0]
        const editor = makeFakeEditor({doc: baseDoc, clientID: "undo-client"})
        const mod = {editor}
        const collabDoc = new ModCollabDoc(mod)
        attachCollabDoc(editor, collabDoc)
        try {
            const rng = makeRng(baseSeed ^ (editCount * 31))
            for (let i = 0; i < editCount; i++) {
                const state = editor.view.state
                const edit = randomEdit(state, rng.int(1, 2 ** 31 - 1))
                if (!edit) {
                    continue
                }
                dispatchThroughProductionPath(editor, edit.tr)
                verifyInvariants(editor, `pre-undo edit ${i}`)
            }
            // Undo everything, then redo.
            for (let i = 0; i < editCount + 2; i++) {
                undo(editor.view.state, tr => editor.view.dispatch(tr))
                verifyInvariants(editor, `undo ${i}`)
            }
            for (let i = 0; i < editCount + 2; i++) {
                redo(editor.view.state, tr => editor.view.dispatch(tr))
                verifyInvariants(editor, `redo ${i}`)
            }
        } finally {
            destroyFakeEditor(editor)
        }
    }
)

runHarness("random-transactions", [
    {label: "random tracked edits keep doc valid", prop: trackedEditsProp},
    {label: "undo/redo after tracked edits", prop: undoRedoProp}
])
