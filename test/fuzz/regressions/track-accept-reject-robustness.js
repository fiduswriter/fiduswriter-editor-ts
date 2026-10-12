// Regression tests for track accept/reject robustness bugs found by
// test/fuzz/track-accept-reject.js. Before the fixes, these documents made
// acceptAll/rejectAll throw (aborting the whole run and leaving the editor
// in a half-processed state); users hit them by tracking edits to figures,
// lists, tables or blockquotes and clicking "accept all".
//
// Run: node test/fuzz/regressions/track-accept-reject-robustness.js
import "../../setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {acceptAll} from "../../../dist/track/accept_all.js"
import {rejectAll} from "../../../dist/track/reject_all.js"
import {trackedTransaction} from "../../../dist/track/index.js"
import {EditorState} from "prosemirror-state"

const USER = {id: 1, username: "user"}
const DATE = 1755000000000

function trackedDoc(blocks) {
    const content = blocks.map(block =>
        typeof block === "function" ? block() : block
    )
    const doc = docSchema.nodes.doc.create({}, [
        docSchema.nodes.title.create(null, docSchema.text("Title")),
        docSchema.nodes.richtext_part.create(
            {id: "body", title: "Body"},
            content
        )
    ])
    return EditorState.create({doc})
}

function hr() {
    return docSchema.nodes.horizontal_rule.create()
}

function para(text) {
    return docSchema.nodes.paragraph.create(
        null,
        text ? [docSchema.text(text)] : []
    )
}

function run(view, fn) {
    try {
        fn(view)
        view.state.doc.check()
        return {ok: true}
    } catch (error) {
        return {ok: false, message: error.message}
    }
}

function makeView(state) {
    const view = {state}
    view.dispatch = tr => {
        view.state = view.state.apply(tr)
    }
    return view
}

function trackEdit(state, buildTr) {
    const tracked = trackedTransaction(
        buildTr(state.tr),
        state,
        USER,
        false,
        DATE
    )
    return state.apply(tracked)
}

// 1. Accepting the deletion of the only block of a part used to throw
//    "Invalid content for node richtext_part" (the part must keep at least
//    one block). Now an empty paragraph keeps the structure valid.
{
    let state = trackedDoc([para("Hello world"), hr()])
    // Track-delete the horizontal rule (the second/last block).
    state = trackEdit(state, tr => tr.delete(15, 16))
    const view = makeView(state)
    const result = run(view, acceptAll)
    assert.strictEqual(
        result.ok,
        true,
        `acceptAll threw on sole-block deletion: ${result.message}`
    )
}

// 2. Rejecting an insertion whose removal empties a parent used to throw
//    "Inconsistent open depths". Same structural guarantee applies.
{
    let state = trackedDoc([para("keep"), para("gone")])
    state = trackEdit(state, tr => tr.insertText("x", 8, 8))
    const view = makeView(state)
    const result = run(view, rejectAll)
    assert.strictEqual(result.ok, true, `rejectAll threw: ${result.message}`)
}

// 3. Deleting a block inside a blockquote that leaves the blockquote empty
//    used to throw; acceptAll must terminate without throwing and keep the
//    document valid.
{
    const blockquote = docSchema.nodes.blockquote.create(null, [para("inner")])
    let state = trackedDoc([para("before"), blockquote])
    let bqPos = -1
    state.doc.descendants((node, pos) => {
        if (bqPos === -1 && node.type.name === "blockquote") {
            bqPos = pos
        }
    })
    state = trackEdit(state, tr =>
        tr.setNodeMarkup(bqPos, null, {
            ...blockquote.attrs,
            track: [
                {
                    type: "deletion",
                    user: 1,
                    username: "user",
                    date: DATE / 60000
                }
            ]
        })
    )
    const view = makeView(state)
    const result = run(view, acceptAll)
    assert.strictEqual(
        result.ok,
        true,
        `acceptAll threw on tracked blockquote: ${result.message}`
    )
}

console.log("track-accept-reject-robustness regressions passed")
