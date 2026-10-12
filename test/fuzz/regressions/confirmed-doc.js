// Regression tests for bugs found by the fuzz campaign (test/fuzz/).
//
// 1. setConfirmedDoc clobbered docInfo.confirmedDoc with undefined whenever
//    receiveDiff carried an empty ds list or only echoed the client's own
//    steps: receiveTransaction returns early without the "rebased" meta in
//    that case, so `rebased + stepsLength` was NaN and tr.docs[NaN]
//    undefined. docInfo.confirmedDoc is the merge base for direct-save
//    merges (no_collab_save) and the doc source for offline getDoc().
// 2. A diff that failed to parse/apply left ModCollabDoc.receiving stuck
//    true, silently blocking every outgoing diff until reload.
//
// Run: node test/fuzz/regressions/confirmed-doc.js
import "../../setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {collab} from "prosemirror-collab"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"

import {ModCollabDoc} from "../../../dist/collab/doc.js"

const doc = docSchema.nodeFromJSON({
    type: "doc",
    attrs: {template: "Regressions"},
    content: [
        {type: "title", content: [{type: "text", text: "Title"}]},
        {
            type: "richtext_part",
            attrs: {id: "body", title: "Body"},
            content: [
                {
                    type: "paragraph",
                    content: [{type: "text", text: "Hello world"}]
                }
            ]
        }
    ]
})

function makeClient(clientID) {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const editor = {
        schema: docSchema,
        client_id: clientID,
        user: {id: 1, username: "user"},
        ws: undefined,
        docInfo: {
            access_rights: "write",
            version: 0,
            confirmedDoc: doc
        },
        dom: container,
        mod: {}
    }
    editor.mod.comments = {
        editor,
        interactions: {isCurrentlyEditing: () => false}
    }
    editor.mod.db = {bibDB: {receive() {}}, imageDB: {receive() {}}}
    editor.mod.citations = {resetCitations() {}, footnoteNumberOverride() {}}
    editor.mod.footnotes = {
        layout: {updateDOM() {}},
        fnEditor: {applyDiffs() {}}
    }
    const state = EditorState.create({
        schema: docSchema,
        doc,
        plugins: [collab({clientID})]
    })
    editor.view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
            this.updateState(this.state.apply(tr))
        }
    })
    const mod = {editor}
    const collabDoc = new ModCollabDoc(mod)
    editor.mod.collab = {doc: collabDoc, pastParticipants: []}
    return {editor, collabDoc}
}

// 1. Empty ds must not clobber confirmedDoc.
{
    const {editor, collabDoc} = makeClient("client-1")
    collabDoc.receiveDiff({ds: [], cid: "other"})
    assert.strictEqual(
        editor.docInfo.confirmedDoc,
        doc,
        "empty ds must leave confirmedDoc untouched"
    )
    // An echo of our own steps (client id matches) must do the same. This
    // shape arrives when the server replays diffs the client already has.
    collabDoc.receiveDiff({
        ds: [
            {
                stepType: "replace",
                from: 3,
                to: 3,
                slice: {content: [{type: "text", text: "X"}]}
            }
        ],
        cid: "client-1"
    })
    assert.strictEqual(
        editor.docInfo.confirmedDoc !== undefined &&
            editor.docInfo.confirmedDoc !== null,
        true,
        "own-step echo must not clobber confirmedDoc with undefined"
    )
}

// 2. A throwing diff must restore the receiving flag and leave the doc
//    unchanged, and the client must stay usable.
{
    const {editor, collabDoc} = makeClient("client-2")
    const before = JSON.stringify(editor.view.state.doc.toJSON())
    assert.throws(
        () =>
            collabDoc.receiveDiff({
                ds: [{stepType: "addMark", mark: {type: "nonexistent"}}],
                cid: "attacker"
            }),
        undefined,
        "malformed step must throw a catchable error"
    )
    assert.strictEqual(collabDoc.receiving, false, "receiving flag restored")
    assert.strictEqual(
        JSON.stringify(editor.view.state.doc.toJSON()),
        before,
        "failed diff must not partially apply"
    )
    // Still usable: a valid diff applies afterwards.
    collabDoc.receiveDiff({
        ds: [
            {
                stepType: "replace",
                from: 3,
                to: 3,
                slice: {content: [{type: "text", text: "Y"}]}
            }
        ],
        cid: "other"
    })
    assert.strictEqual(
        editor.view.state.doc.textContent.includes("Y"),
        true,
        "valid diff applies after a failed one"
    )
}

console.log("confirmed-doc regressions passed")
