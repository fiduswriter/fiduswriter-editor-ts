// Tests for the direct-save (NoCollabSave) merge helpers in
// dist/no_collab_save/merge.js: rebasing remote steps over local unconfirmed
// steps via prosemirror-collab's receiveTransaction, plus the queue
// confirmation used after a successful save. These run against the compiled
// dist code with the real ProseMirror packages (jest mocks those out, so this
// is a plain node script like tracked-changes.js).
import "../test/setup.js"
import assert from "node:assert"

import {Schema} from "prosemirror-model"
import {EditorState} from "prosemirror-state"
import {collab, sendableSteps} from "prosemirror-collab"
import {Transform} from "prosemirror-transform"

import {
    createConfirmTransaction,
    createRemoteTransaction,
    getRemoteSteps
} from "../dist/no_collab_save/merge.js"

const schema = new Schema({
    nodes: {
        doc: {content: "paragraph+"},
        paragraph: {content: "text*", group: "block"},
        text: {group: "inline"}
    }
})

function doc(text) {
    return schema.node("doc", null, [
        schema.node("paragraph", null, text ? [schema.text(text)] : [])
    ])
}

function collabState(docNode) {
    return EditorState.create({
        doc: docNode,
        plugins: [collab({clientID: 4242})]
    })
}

function applyLocal(state, step) {
    const tr = state.tr
    tr.step(step)
    return state.apply(tr)
}

function replaceStep(fromDoc, from, to, text) {
    return new Transform(fromDoc).replaceWith(from, to, schema.text(text))
        .steps[0]
}

function remoteTransform(baseDoc, serverDoc) {
    return getRemoteSteps(schema, baseDoc, serverDoc)
}

function merge(state, baseDoc, serverDoc) {
    const {steps, clientIds} = remoteTransform(baseDoc, serverDoc)
    return state.apply(createRemoteTransaction(state, steps, clientIds))
}

// 1. Idle editor: a remote change is applied directly.
{
    const base = doc("Hello")
    const server = doc("Hello B")
    let state = collabState(base)
    state = merge(state, base, server)
    assert.strictEqual(state.doc.textContent, "Hello B")
    assert.strictEqual(sendableSteps(state), null)
    console.log("ok 1 - remote-only change applied")
}

// 2. Disjoint local and remote edits are both present after the merge.
{
    // Text positions inside the paragraph start at 1, so the end of
    // "Hello world" (11 chars) is position 12.
    const base = doc("Hello world")
    const server = doc("B Hello world")
    let state = collabState(base)
    state = applyLocal(state, replaceStep(base, 12, 12, " A"))
    state = merge(state, base, server)
    assert.strictEqual(state.doc.textContent, "B Hello world A")
    const sendable = sendableSteps(state)
    assert.ok(sendable && sendable.steps.length === 1)
    console.log("ok 2 - disjoint edits merged, local step stays unconfirmed")
}

// 3. Local and remote insert at the same position: both survive.
{
    const base = doc("Hello")
    const server = doc("Hello B")
    let state = collabState(base)
    state = applyLocal(state, replaceStep(base, 6, 6, " A"))
    state = merge(state, base, server)
    const text = state.doc.textContent
    assert.ok(text.includes("Hello"), text)
    assert.ok(text.includes(" A"), text)
    assert.ok(text.includes(" B"), text)
    console.log("ok 3 - same-position insertions both survive:", text)
}

// 4. Conflicting replacement over a range that was deleted remotely:
//    prose mirror-collab's rebase keeps the local content at the deletion
//    point instead of throwing, so no local work is lost.
{
    const base = doc("Hello world")
    const server = doc("Bye")
    let state = collabState(base)
    // "world" covers positions 7..12.
    state = applyLocal(state, replaceStep(base, 7, 12, "there"))
    state = merge(state, base, server)
    assert.strictEqual(state.doc.textContent, "Byethere")
    console.log("ok 4 - conflicting replacement keeps local content")
}

// 5. Confirming the sent prefix after a save keeps the rebase base correct:
//    only changes made after the confirmed prefix are rebased.
{
    const base = doc("Hello")
    let state = collabState(base)
    const stepA = replaceStep(base, 6, 6, " A")
    state = applyLocal(state, stepA)
    const sent = sendableSteps(state)
    assert.ok(sent && sent.steps.length === 1)
    const confirmTr = createConfirmTransaction(state, sent.steps, 4242)
    assert.ok(confirmTr)
    state = state.apply(confirmTr)
    assert.strictEqual(sendableSteps(state), null)
    assert.strictEqual(state.doc.textContent, "Hello A")

    // The server now has "Hello A"; a second editor appended " B".
    const savedBase = doc("Hello A")
    const server = doc("Hello A B")
    const stepB = replaceStep(state.doc, 8, 8, "!")
    state = applyLocal(state, stepB)
    state = merge(state, savedBase, server)
    assert.strictEqual(state.doc.textContent, "Hello A B!")
    const sendable = sendableSteps(state)
    assert.ok(sendable && sendable.steps.length === 1)
    console.log("ok 5 - confirmed prefix excluded from later rebases")
}

// 6. Server-provided covering steps are used when they reproduce the server
//    document, and discarded when they do not.
{
    const base = doc("Hello")
    const server = doc("Hello B")
    const serverStep = replaceStep(base, 6, 6, " B")
    const good = getRemoteSteps(schema, base, server, [
        {ds: [serverStep.toJSON()], cid: 7}
    ])
    assert.strictEqual(good.steps.length, 1)
    assert.deepStrictEqual(good.clientIds, [7])

    const stale = getRemoteSteps(schema, base, server, [
        {ds: [replaceStep(base, 6, 6, "X").toJSON()], cid: 7}
    ])
    assert.strictEqual(stale.steps.length, 1)
    assert.deepStrictEqual(stale.clientIds, ["remote"])
    const s = collabState(base)
    const state = s.apply(
        createRemoteTransaction(s, stale.steps, stale.clientIds)
    )
    assert.strictEqual(state.doc.textContent, "Hello B")
    console.log("ok 6 - covering steps preferred only when exact")
}

console.log("no-collab-save-merge tests passed")
