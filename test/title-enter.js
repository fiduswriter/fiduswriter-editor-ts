// Tests for the Enter key at the end of the title field: the caret moves to
// the next visible field (hidden parts are skipped) instead of doing nothing,
// which is what the schema-enforced no-split behavior would amount to. These
// run against the compiled dist code with the real ProseMirror packages
// (jest mocks those out, so this is a plain node script like
// tracked-changes.js).
import "../test/setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {Fragment} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"

import {buildEditorKeymap} from "../dist/keymap.js"

const para = children =>
    docSchema.nodes.paragraph.create(null, Fragment.fromArray(children))
const text = (content, marks) => docSchema.text(content, marks)

const richtextPart = (id, hidden = false) =>
    docSchema.nodes.richtext_part.create(
        {
            title: id,
            id,
            elements: ["paragraph"],
            marks: [],
            hidden
        },
        Fragment.fromArray([para([text(`${id} text`)])])
    )

const makeState = (parts, titleText = "My title") => {
    const title = docSchema.nodes.title.create(null, text(titleText))
    const doc = docSchema.nodes.doc.create(
        {},
        Fragment.fromArray([title, ...parts])
    )
    const titleEnd = 1 + title.content.size
    return EditorState.create({
        doc,
        selection: TextSelection.create(doc, titleEnd)
    })
}

const runEnter = state => {
    const command = buildEditorKeymap(docSchema).Enter
    let newState = null
    const result = command(state, tr => {
        newState = state.apply(tr)
    })
    return {result, newState}
}

const textPos = (doc, str) => {
    let found = -1
    doc.descendants((node, pos) => {
        if (node.isText && node.text === str) {
            found = pos
        }
    })
    return found
}

// 1. The caret lands at the start of the next part.
{
    const state = makeState([
        richtextPart("subtitle"),
        richtextPart("abstract")
    ])
    const {result, newState} = runEnter(state)
    assert.strictEqual(result, true)
    assert.strictEqual(
        newState.selection.from,
        textPos(newState.doc, "subtitle text")
    )
}

// 2. Hidden parts are skipped: the caret lands in the first visible part.
{
    const state = makeState([
        richtextPart("subtitle", true),
        richtextPart("abstract", true),
        richtextPart("keywords")
    ])
    const {result, newState} = runEnter(state)
    assert.strictEqual(result, true)
    assert.strictEqual(
        newState.selection.from,
        textPos(newState.doc, "keywords text")
    )
}

// 3. A contributors part (inline content, no textblock) also receives the caret.
{
    const state = makeState([
        docSchema.nodes.contributors_part.create({id: "authors"})
    ])
    const {result, newState} = runEnter(state)
    assert.strictEqual(result, true)
    assert.strictEqual(
        newState.selection.$from.parent.type.name,
        "contributors_part"
    )
}

// 4. Enter in the middle of the title does not move the caret.
{
    const state = makeState([richtextPart("subtitle")])
    const middle = 2
    const midState = state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, middle))
    )
    const {result, newState} = runEnter(midState)
    assert.strictEqual(result, false)
    assert.strictEqual(newState, null)
}

// 5. Enter outside the title is not handled by this command.
{
    const state = makeState([richtextPart("subtitle")])
    const bodyPos = textPos(state.doc, "subtitle text") + "subtitle text".length
    const bodyState = state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, bodyPos))
    )
    const {result, newState} = runEnter(bodyState)
    assert.strictEqual(result, false)
    assert.strictEqual(newState, null)
}

// 6. A document consisting of only a title has no next field.
{
    const state = makeState([])
    const {result, newState} = runEnter(state)
    assert.strictEqual(result, false)
    assert.strictEqual(newState, null)
}

console.log("title-enter tests passed")
