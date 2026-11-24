// Tests for Tab/Shift+Tab indenting and outdenting list items, and for the
// accessibility guarantees around it: the key is only captured inside list
// items, and a Tab pressed shortly after Escape is never captured, so focus
// navigation always remains available (WCAG 2.1.2 "No Keyboard Trap"). Runs
// against the compiled dist code with the real ProseMirror packages (jest
// mocks those out, so this is a plain node script like title-enter.js).
import "../test/setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {Fragment} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"

import {buildListIndentKeymap} from "../dist/keymap.js"

const text = content => docSchema.text(content)
const para = content =>
    docSchema.nodes.paragraph.create(null, Fragment.fromArray([text(content)]))
const listItem = content =>
    docSchema.nodes.list_item.create(null, para(content))
const bulletList = (...items) =>
    docSchema.nodes.bullet_list.create(null, Fragment.fromArray(items))

const richtextPart = content =>
    docSchema.nodes.richtext_part.create(
        {
            title: "body",
            id: "body",
            elements: ["paragraph", "bullet_list"],
            marks: [],
            hidden: false
        },
        Fragment.fromArray(content)
    )

const makeState = content => {
    const title = docSchema.nodes.title.create(null, text("My title"))
    const doc = docSchema.nodes.doc.create(
        {},
        Fragment.fromArray([title, richtextPart(content)])
    )
    return EditorState.create({doc})
}

// Caret in the middle of the paragraph containing `needle`.
const stateWithCaret = (state, needle) => {
    let pos = -1
    state.doc.descendants((node, pos_) => {
        if (node.isText && node.text.includes(needle)) {
            pos = pos_ + node.text.indexOf(needle) + 1
            return false
        }
    })
    assert.notStrictEqual(pos, -1, `text ${needle} not found`)
    return state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, pos))
    )
}

const runKey = (plugin, state, key, shiftKey = false) => {
    let newState = null
    const view = {
        state,
        dispatch: tr => {
            newState = state.apply(tr)
        }
    }
    const result = plugin.props.handleKeyDown(view, {key, shiftKey})
    return {result, newState}
}

const plugin = buildListIndentKeymap(docSchema)

// 1. Tab inside a list item sinks it one level (under the previous item).
{
    const state = makeState([
        bulletList(listItem("Item A"), listItem("Item B"))
    ])
    const {result, newState} = runKey(
        plugin,
        stateWithCaret(state, "Item B"),
        "Tab"
    )
    assert.strictEqual(result, true)
    const stringified = newState.doc.toString()
    assert.ok(
        stringified.includes(
            'bullet_list(list_item(paragraph("Item A"), bullet_list(list_item(paragraph("Item B")'
        ),
        `expected nested list, got: ${stringified}`
    )
}

// 2. Tab in a plain paragraph is not captured (focus navigation).
{
    const state = makeState([para("Just a paragraph.")])
    const {result, newState} = runKey(
        plugin,
        stateWithCaret(state, "paragraph"),
        "Tab"
    )
    assert.strictEqual(result, false)
    assert.strictEqual(newState, null)
}

// 3. Shift+Tab lifts a nested list item back out.
{
    const state = makeState([
        bulletList(
            listItem("Item A"),
            docSchema.nodes.list_item.create(
                null,
                Fragment.fromArray([
                    para("Item X"),
                    bulletList(listItem("Item B"))
                ])
            )
        )
    ])
    const {result, newState} = runKey(
        plugin,
        stateWithCaret(state, "Item B"),
        "Tab",
        true
    )
    assert.strictEqual(result, true)
    const stringified = newState.doc.toString()
    assert.ok(
        stringified.includes(
            'list_item(paragraph("Item X")), list_item(paragraph("Item B"))'
        ),
        `expected Item B lifted to the top-level list, got: ${stringified}`
    )
}

// 4. A Tab directly after Escape is never captured (escape hatch).
{
    const state = makeState([
        bulletList(listItem("Item A"), listItem("Item B"))
    ])
    const withCaret = stateWithCaret(state, "Item B")
    assert.strictEqual(runKey(plugin, withCaret, "Escape").result, false)
    const {result, newState} = runKey(plugin, withCaret, "Tab")
    assert.strictEqual(result, false)
    assert.strictEqual(newState, null)
}

// 5. Once the escape-hatch window has passed, Tab indents again.
{
    const realNow = Date.now
    try {
        const state = makeState([
            bulletList(listItem("Item A"), listItem("Item B"))
        ])
        const withCaret = stateWithCaret(state, "Item B")
        runKey(plugin, withCaret, "Escape")
        Date.now = () => realNow() + 4000
        const {result, newState} = runKey(plugin, withCaret, "Tab")
        assert.strictEqual(result, true)
        assert.ok(
            newState.doc
                .toString()
                .includes(
                    'bullet_list(list_item(paragraph("Item A"), bullet_list'
                )
        )
    } finally {
        Date.now = realNow
    }
}

console.log("list-indent-tab tests passed")
