// Tests for the tracked changes functionality: trackedTransaction,
// acceptAll and rejectAll. These run against the compiled dist code with the
// real ProseMirror packages (jest mocks those out, so this is a plain node
// script like copy-serializer.js).
import "../test/setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {Fragment, Slice} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"

import {acceptAll, rejectAll} from "../dist/track/index.js"
import {trackedTransaction} from "../dist/track/index.js"

const USER = {id: 1, username: "tester"}
const DATE = 1755000000000

const strongMark = docSchema.marks.strong.create()
const para = children => docSchema.nodes.paragraph.create(null, Fragment.fromArray(children))
const text = (content, marks) => docSchema.text(content, marks)

function makeDoc(contentText) {
    const bodyPart = docSchema.nodes.richtext_part.create(
        {
            title: "Body",
            id: "body",
            elements: [
                "paragraph",
                "heading1",
                "heading2",
                "heading3",
                "heading4",
                "heading5",
                "heading6",
                "code_block",
                "figure",
                "ordered_list",
                "bullet_list",
                "horizontal_rule",
                "equation",
                "citation",
                "cross_reference",
                "blockquote",
                "footnote",
                "table"
            ],
            marks: ["strong", "em", "link"]
        },
        Fragment.fromArray([para([text(contentText)])])
    )
    return docSchema.nodes.doc.create({}, Fragment.fromArray([
        docSchema.nodes.title.create(null, text("Title")),
        docSchema.nodes.contributors_part.create({id: "authors"}),
        bodyPart
    ]))
}

function makeState(contentText) {
    const doc = makeDoc(contentText)
    const state = EditorState.create({doc})
    const pos = {}
    // Text node positions are relative to the node - find the words inside it.
    doc.descendants((node, nodePos) => {
        if (!node.isText) return
        const helloIndex = node.text.indexOf("Hello")
        if (helloIndex !== -1 && pos.helloStart === undefined) {
            pos.helloStart = nodePos + helloIndex
            pos.helloEnd = pos.helloStart + 5
        }
        const worldIndex = node.text.indexOf("world")
        if (worldIndex !== -1) {
            pos.worldStart = nodePos + worldIndex
            pos.worldEnd = pos.worldStart + 5
        }
    })
    return {state, pos}
}

function findWordRange(doc, snippet) {
    let from = -1,
        to = -1
    doc.descendants((node, nodePos) => {
        if (from !== -1 || !node.isText) return
        const index = node.text.indexOf(snippet)
        if (index !== -1) {
            from = nodePos + index
            to = from + snippet.length
        }
    })
    return {from, to}
}

function applyTracked(state, buildTr) {
    const tr = buildTr(state.tr)
    const tracked = trackedTransaction(tr, state, USER, false, DATE)
    return state.apply(tracked)
}

function collectTexts(doc) {
    const texts = []
    doc.descendants(node => {
        if (node.isText) {
            texts.push({
                text: node.text,
                marks: node.marks.map(mark => mark.type.name),
                rawMarks: node.marks
            })
        }
    })
    return texts
}

function getTextsIncluding(doc, snippet) {
    return collectTexts(doc).filter(textObj => textObj.text.includes(snippet))
}

function makeView(state) {
    const view = {state}
    view.dispatch = tr => {
        view.state = view.state.apply(tr)
    }
    return view
}

let passed = 0,
    failed = 0
function check(label, fn) {
    try {
        fn()
        passed++
        console.log(`OK ${label}`)
    } catch (error) {
        failed++
        console.log(`FAILED ${label}: ${error.message}`)
        if (process.env.TRACK_DEBUG) {
            console.log(error.stack)
        }
    }
}

check("tracked insertion adds unapproved insertion marks", () => {
    const {state, pos} = makeState("Hello world")
    // Insert "X" between the two words, as typing would.
    const insertPos = pos.helloStart + 5
    const newState = applyTracked(state, tr => tr.insertText("X", insertPos, insertPos))
    assert.strictEqual(newState.doc.textContent.includes("HelloX world"), true)
    const inserted = getTextsIncluding(newState.doc, "X")
    assert.strictEqual(inserted.length > 0, true)
    assert.strictEqual(inserted[0].marks.includes("insertion"), true)
})

check("tracked deletion keeps deleted text with deletion marks", () => {
    const {state, pos} = makeState("Hello world")
    const newState = applyTracked(state, tr =>
        tr.setSelection(TextSelection.create(tr.doc, pos.worldStart, pos.worldEnd)).deleteSelection()
    )
    assert.strictEqual(
        newState.doc.textContent.includes("world"),
        true,
        "deleted word should still be present under track changes"
    )
    const marked = getTextsIncluding(newState.doc, "world").filter(textObj =>
        textObj.marks.includes("deletion")
    )
    assert.strictEqual(marked.length > 0, true)
})

check("deleting own unapproved insertion removes it outright", () => {
    const {state, pos} = makeState("Hello world")
    const insertPos = pos.helloStart + 5
    let newState = applyTracked(state, tr => tr.insertText("X", insertPos, insertPos))
    // Find the inserted character and delete it again, still tracking.
    let xFrom = -1,
        xTo = -1
    newState.doc.descendants((node, nodePos) => {
        if (xFrom === -1 && node.isText && node.text.includes("X")) {
            xFrom = nodePos + node.text.indexOf("X")
            xTo = xFrom + 1
        }
    })
    newState = applyTracked(newState, tr =>
        tr.setSelection(TextSelection.create(tr.doc, xFrom, xTo)).deleteSelection()
    )
    assert.strictEqual(
        newState.doc.textContent.includes("X"),
        false,
        "own unapproved insertion should be removed without a deletion mark"
    )
})

check("adding a format creates a format_change mark", () => {
    const {state, pos} = makeState("Hello world")
    const newState = applyTracked(state, tr => tr.addMark(pos.worldStart, pos.worldEnd, strongMark))
    const word = getTextsIncluding(newState.doc, "world")[0]
    assert.strictEqual(word.marks.includes("strong"), true)
    assert.strictEqual(word.marks.includes("format_change"), true)
})

check("removing a format creates a format_change mark", () => {
    const doc = (() => {
        const bodyPart = docSchema.nodes.richtext_part.create(
            {title: "Body", id: "body", marks: ["strong", "em", "link"]},
            Fragment.fromArray([para([text("Hello "), text("world", [strongMark])])])
        )
        return docSchema.nodes.doc.create({}, Fragment.fromArray([
            docSchema.nodes.title.create(null, text("Title")),
            docSchema.nodes.contributors_part.create({id: "authors"}),
            bodyPart
        ]))
    })()
    const state = EditorState.create({doc})
    const {from: worldFrom, to: worldTo} = findWordRange(doc, "world")
    assert.strictEqual(worldFrom !== -1, true)
    const newState = applyTracked(state, tr => tr.removeMark(worldFrom, worldTo, strongMark))
    const word = getTextsIncluding(newState.doc, "world")[0]
    assert.strictEqual(word.marks.includes("strong"), false)
    assert.strictEqual(word.marks.includes("format_change"), true)
})

check("acceptAll applies insertions and removes deletions", () => {
    const {state, pos} = makeState("Hello world")
    // Track-insert X and track-delete "world".
    let newState = applyTracked(state, tr => tr.insertText("X", pos.helloStart + 5, pos.helloStart + 5))
    const {from: delFrom, to: delTo} = findWordRange(newState.doc, "world")
    newState = applyTracked(newState, tr =>
        tr.setSelection(TextSelection.create(tr.doc, delFrom, delTo)).deleteSelection()
    )
    const view = makeView(newState)
    acceptAll(view)
    const result = view.state.doc.textContent
    assert.strictEqual(result.includes("HelloX"), true, "inserted text should remain")
    assert.strictEqual(result.includes("world"), false, "deleted text should be gone")
    // Accepting an insertion approves it rather than stripping the mark.
    const acceptedInsertion = getTextsIncluding(view.state.doc, "X")[0]
    const insertionMark = acceptedInsertion?.rawMarks.find(
        mark => mark.type.name === "insertion"
    )
    assert.strictEqual(insertionMark !== undefined, true)
    assert.strictEqual(insertionMark.attrs.approved, true)
    const openTrackMarks = collectTexts(view.state.doc).some(textObj =>
        textObj.marks.some(markName =>
            ["deletion", "format_change"].includes(markName)
        )
    )
    assert.strictEqual(openTrackMarks, false, "no open track changes should remain")
})

check("rejectAll restores the original document text", () => {
    const {state, pos} = makeState("Hello world")
    let newState = applyTracked(state, tr => tr.insertText("X", pos.helloStart + 5, pos.helloStart + 5))
    const {from: delFrom, to: delTo} = findWordRange(newState.doc, "world")
    newState = applyTracked(newState, tr =>
        tr.setSelection(TextSelection.create(tr.doc, delFrom, delTo)).deleteSelection()
    )
    const view = makeView(newState)
    rejectAll(view)
    assert.strictEqual(
        view.state.doc.textContent.includes("Hello world"),
        true,
        "original text should be restored"
    )
    assert.strictEqual(view.state.doc.textContent.includes("X"), false)
})

check("pasted content receives insertion marks under track changes", () => {
    const {state, pos} = makeState("Hello world")
    // The slice shape that transformPasted produces for same-document pastes
    // since the paste crash fix: an open paragraph slice.
    const slice = new Slice(
        Fragment.from(para([text("NEW", [strongMark])])),
        1,
        1
    )
    const insertPos = pos.helloStart + 5
    const newState = applyTracked(state, tr =>
        tr.setSelection(TextSelection.create(tr.doc, insertPos, insertPos)).replaceSelection(slice)
    )
    assert.strictEqual(newState.doc.textContent.includes("NEW"), true)
    const inserted = getTextsIncluding(newState.doc, "NEW")
    assert.strictEqual(inserted.length > 0, true)
    assert.strictEqual(inserted[0].marks.includes("insertion"), true)
})

console.log(`\ntracked-changes: ${passed} passed, ${failed} failed`)
if (failed) {
    process.exit(1)
}
