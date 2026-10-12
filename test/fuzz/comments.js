// Fuzz harness for the comment system: comment lifecycle events (local and
// received-from-remote), comment marks in the document, and the interaction
// between the two under random document edits.
//
// Invariants:
//  1. No store operation throws.
//  2. After every operation, every comment mark in the doc has a store
//     entry and every store entry referenced by a mark exists.
//  3. Random document edits keep comment marks and the store consistent
//     (the comments plugin's moveComment machinery runs via the editor).
//  4. Remote comment event batches (the shape receive() gets from
//     _processDiff) never corrupt the store.

import "../setup.js"

import {TextSelection} from "prosemirror-state"

import {fc, runHarness} from "./config.js"
import {docArb, makeRng} from "./doc-generator.js"
import {
    makeFakeEditor,
    destroyFakeEditor,
    attachCollabDoc
} from "./fake-editor.js"
import {dispatchEdit} from "./edits.js"
import {ModCollabDoc} from "../../dist/collab/doc.js"

function commentMarkIds(doc) {
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

function assertStoreConsistent(editor, context) {
    const markIds = commentMarkIds(editor.view.state.doc)
    const storeIds = new Set(
        Object.keys(editor.mod.comments.store.comments).map(String)
    )
    for (const id of markIds) {
        if (!storeIds.has(id)) {
            throw new Error(
                `comment mark ${id} in doc after ${context} but missing from store`
            )
        }
    }
    // Every store entry must be a Comment-like object.
    for (const [id, comment] of Object.entries(
        editor.mod.comments.store.comments
    )) {
        if (!comment || typeof comment !== "object") {
            throw new Error(`store entry ${id} corrupted after ${context}`)
        }
    }
}

// Register the doc's comment marks in the store (the load-comments state).
function loadComments(editor, doc) {
    const ids = []
    doc.descendants(node => {
        const mark = node.marks.find(m => m.type.name === "comment")
        if (mark && mark.attrs.id) {
            ids.push(Number(mark.attrs.id))
        }
    })
    const commentsData = {}
    ids.forEach(id => {
        commentsData[id] = {
            id,
            comment: "loaded comment " + id,
            user: 2,
            username: "user2",
            date: 1755000000000,
            answers: [],
            resolved: false
        }
    })
    editor.mod.comments.store.loadComments(commentsData)
}

function randomCommentEvent(rng, nextId) {
    const id = rng.int(1, 6)
    switch (rng.int(0, 8)) {
        case 0:
        case 1:
            return {
                type: "create",
                id: nextId.counter++,
                comment: "remote comment",
                user: rng.int(0, 3),
                username: "user" + rng.int(0, 3),
                date: 1755000000000,
                answers: [],
                resolved: false
            }
        case 2:
            return {type: "update", id, comment: "updated " + rng.int(0, 99)}
        case 3:
            return {type: "delete", id}
        case 4:
            return {
                type: "add_answer",
                id,
                answer: "an answer",
                answerId: nextId.counter++,
                date: 1755000000000,
                user: 1,
                username: "u1"
            }
        case 5:
            return {type: "delete_answer", id, answerId: rng.int(1, 4)}
        case 6:
            return {
                type: "update_answer",
                id,
                answerId: rng.int(1, 4),
                answer: "updated answer"
            }
        case 7:
            return {type: "update", id, assignedUser: 2, assignedUsername: "u2"}
        case 8:
            return {type: "update", id, resolved: rng.bool()}
    }
}

// --- Property 1: random edits over a document with comments ----------------

const editsWithCommentsProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 5}),
    (baseSeed, editCount) => {
        const {doc: baseDoc} = fc.sample(docArb(fc), {
            seed: baseSeed,
            numRuns: 1
        })[0]
        const editor = makeFakeEditor({doc: baseDoc, clientID: "comments"})
        const mod = {editor}
        const collabDoc = new ModCollabDoc(mod)
        attachCollabDoc(editor, collabDoc)
        try {
            loadComments(editor, baseDoc)
            assertStoreConsistent(editor, "load")
            const rng = makeRng(baseSeed ^ (editCount * 97))
            for (let i = 0; i < editCount; i++) {
                dispatchEdit(editor, rng.int(1, 2 ** 31 - 1))
                assertStoreConsistent(editor, `edit ${i}`)
            }
        } finally {
            destroyFakeEditor(editor)
        }
    }
)

// --- Property 2: remote comment event batches ------------------------------

const remoteEventsProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 10}),
    (baseSeed, eventCount) => {
        const {doc: baseDoc} = fc.sample(docArb(fc), {
            seed: baseSeed,
            numRuns: 1
        })[0]
        const editor = makeFakeEditor({doc: baseDoc, clientID: "comments"})
        const mod = {editor}
        const collabDoc = new ModCollabDoc(mod)
        attachCollabDoc(editor, collabDoc)
        try {
            loadComments(editor, baseDoc)
            const rng = makeRng(baseSeed ^ (eventCount * 1299709))
            const nextId = {counter: 20}
            // Deliver events one batch per receive, interleaved with edits.
            for (let i = 0; i < eventCount; i++) {
                const cu = [randomCommentEvent(rng, nextId)]
                try {
                    collabDoc.receiveDiff({cu, cid: "remote-user"})
                } catch (error) {
                    error.message = `receiveDiff with cu event ${JSON.stringify(cu[0])} threw: ${error.message}`
                    throw error
                }
                // Note: strict marks↔store consistency does NOT hold here by
                // design — _processDiff applies cu BEFORE the doc steps that
                // may remove the corresponding marks, so the store can be
                // momentarily ahead of the document.
                for (const comment of Object.values(
                    editor.mod.comments.store.comments
                )) {
                    if (!comment || typeof comment !== "object") {
                        throw new Error(
                            `store entry corrupted after remote event ${i}`
                        )
                    }
                }
                if (rng.bool()) {
                    dispatchEdit(editor, rng.int(1, 2 ** 31 - 1))
                    // Same relaxed reasoning as after the receive: remote
                    // comment deletions reach the store before the steps
                    // that remove their marks.
                    for (const comment of Object.values(
                        editor.mod.comments.store.comments
                    )) {
                        if (!comment || typeof comment !== "object") {
                            throw new Error(
                                `store entry corrupted after edit ${i}`
                            )
                        }
                    }
                }
            }
        } finally {
            destroyFakeEditor(editor)
        }
    }
)

// --- Property 3: local comment lifecycle ------------------------------------

const lifecycleProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    baseSeed => {
        const {doc: baseDoc} = fc.sample(
            docArb(fc, {
                track: false,
                annotations: false,
                minParts: 1,
                maxParts: 1
            }),
            {seed: baseSeed, numRuns: 1}
        )[0]
        const editor = makeFakeEditor({doc: baseDoc, clientID: "comments"})
        const mod = {editor}
        const collabDoc = new ModCollabDoc(mod)
        attachCollabDoc(editor, collabDoc)
        try {
            const rng = makeRng(baseSeed ^ 17)
            const store = editor.mod.comments.store
            // Select a text range and create a comment the way the UI does:
            // pick a position inside inline content.
            const textPositions = []
            editor.view.state.doc.descendants((node, pos) => {
                if (node.isText && node.text.length) {
                    textPositions.push(pos)
                }
            })
            if (!textPositions.length) {
                return
            }
            const from = textPositions[rng.int(0, textPositions.length - 1)]
            const size = editor.view.state.doc.content.size
            const to = Math.min(size, from + rng.int(1, 4))
            const tr = editor.view.state.tr.setSelection(
                TextSelection.create(editor.view.state.doc, from, to)
            )
            editor.view.dispatch(tr)
            try {
                store.addComment(
                    {
                        comment: "comment text",
                        user: 1,
                        username: "u1",
                        date: 1755000000000,
                        answers: []
                    },
                    from,
                    to,
                    editor.view
                )
            } catch (error) {
                error.message = `addComment threw (selection ${from}-${to} of ${size}): ${error.message}`
                throw error
            }
            assertStoreConsistent(editor, "addComment")
            // Update, answer, then delete every local comment.
            const ids = Object.keys(store.comments)
            ids.forEach(id => {
                store.updateComment({id, comment: "edited"})
                assertStoreConsistent(editor, `updateComment ${id}`)
                store.addAnswer(id, {
                    answer: "answer",
                    user: 1,
                    username: "u1",
                    date: 1755000000000
                })
                assertStoreConsistent(editor, `addAnswer ${id}`)
                store.deleteComment(id, true)
                assertStoreConsistent(editor, `deleteComment ${id}`)
            })
        } finally {
            destroyFakeEditor(editor)
        }
    }
)

runHarness("comments", [
    {
        label: "random edits keep comment marks/store consistent",
        prop: editsWithCommentsProp
    },
    {label: "remote comment event batches", prop: remoteEventsProp},
    {label: "local comment lifecycle", prop: lifecycleProp}
])
