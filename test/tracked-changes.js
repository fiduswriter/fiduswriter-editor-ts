// Tests for the tracked changes functionality: trackedTransaction,
// acceptAll and rejectAll. These run against the compiled dist code with the
// real ProseMirror packages (jest mocks those out, so this is a plain node
// script like copy-serializer.js).
import "../test/setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {Fragment, Slice} from "prosemirror-model"
import {EditorState, NodeSelection, TextSelection} from "prosemirror-state"

import {acceptAll, rejectAll} from "../dist/track/index.js"
import {trackedTransaction} from "../dist/track/index.js"
import {accept} from "../dist/track/accept.js"
import {reject} from "../dist/track/reject.js"

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

function makeFigureDoc() {
    const bodyPart = docSchema.nodes.richtext_part.create(
        {title: "Body", id: "body", marks: ["strong", "em", "link"]},
        Fragment.fromArray([
            para([text("Before the figure")]),
            docSchema.nodes.figure.create(
                {category: "figure", caption: false},
                Fragment.fromArray([
                    docSchema.nodes.image.create({src: "test.png"}),
                    docSchema.nodes.figure_caption.create(
                        null,
                        Fragment.fromArray([para([text("Caption")])])
                    )
                ])
            ),
            para([text("After the figure")])
        ])
    )
    return docSchema.nodes.doc.create({}, Fragment.fromArray([
        docSchema.nodes.title.create(null, text("Title")),
        docSchema.nodes.contributors_part.create({id: "authors"}),
        bodyPart
    ]))
}

// Selecting a figure (NodeSelection) and deleting it under track changes
// stores the change in the figure's track attribute. Accept/reject from the
// margin box have to work on those block level changes as well - they used to
// bail out silently because they only looked for marks.
function trackedFigureDeletion() {
    const doc = makeFigureDoc()
    let figPos = -1
    doc.descendants((node, pos) => {
        if (figPos === -1 && node.type.name === "figure") {
            figPos = pos
        }
    })
    assert.strictEqual(figPos !== -1, true)
    const state = EditorState.create({doc})
    const trackedState = applyTracked(state, tr =>
        tr.setSelection(NodeSelection.create(tr.doc, figPos)).deleteSelection()
    )
    const figNode = trackedState.doc.nodeAt(figPos)
    assert.strictEqual(figNode?.type.name, "figure")
    assert.strictEqual(
        (figNode.attrs.track || []).some(track => track.type === "deletion"),
        true
    )
    return {state: trackedState, figPos}
}

check("tracked figure deletion is accepted and removes the figure", () => {
    const {state, figPos} = trackedFigureDeletion()
    const view = makeView(state)
    accept("deletion", figPos, view)
    let found = 0
    view.state.doc.descendants(node => {
        if (node.type.name === "figure") {
            found++
        }
    })
    assert.strictEqual(found, 0, "figure should be gone after accepting deletion")
    assert.strictEqual(
        view.state.doc.textContent.includes("Caption"),
        false,
        "figure caption should be gone as well"
    )
    assert.strictEqual(
        view.state.doc.textContent.includes("After the figure"),
        true,
        "surrounding text should remain"
    )
})

check("tracked figure deletion is rejected and restores the figure", () => {
    const {state, figPos} = trackedFigureDeletion()
    const view = makeView(state)
    reject("deletion", figPos, view)
    const figNode = view.state.doc.nodeAt(figPos)
    assert.strictEqual(figNode?.type.name, "figure", "figure should still be present")
    assert.strictEqual(figNode.attrs.track.length, 0, "deletion track entry should be removed")
    assert.strictEqual(
        view.state.doc.textContent.includes("Caption"),
        true,
        "caption should remain"
    )
})

check("block level block_change can be accepted and rejected", () => {
    const makeDocWithBlockChange = () => {
        const bodyPart = docSchema.nodes.richtext_part.create(
            {title: "Body", id: "body", marks: ["strong", "em", "link"]},
            Fragment.fromArray([
                Object.assign(
                    para([text("Once a heading")]),
                    {
                        attrs: Object.assign({}, para([]).attrs, {
                            track: [
                                {
                                    type: "block_change",
                                    user: USER.id,
                                    username: USER.username,
                                    date: DATE / 60000,
                                    before: {type: "heading1", attrs: {}}
                                }
                            ]
                        })
                    }
                )
            ])
        )
        return docSchema.nodes.doc.create({}, Fragment.fromArray([
            docSchema.nodes.title.create(null, text("Title")),
            docSchema.nodes.contributors_part.create({id: "authors"}),
            bodyPart
        ]))
    }

    // Reject restores the previous node type.
    const rejectedView = makeView(EditorState.create({doc: makeDocWithBlockChange()}))
    let changedPos = -1
    rejectedView.state.doc.descendants((node, pos) => {
        if (changedPos === -1 && node.type.name === "paragraph" && node.attrs.track.length) {
            changedPos = pos
        }
    })
    reject("block_change", changedPos, rejectedView)
    const restored = rejectedView.state.doc.nodeAt(changedPos)
    assert.strictEqual(restored.type.name, "heading1", "previous type should be restored")
    assert.strictEqual(restored.attrs.track.length, 0)

    // Accept keeps the current type but removes the track entry.
    const acceptedView = makeView(EditorState.create({doc: makeDocWithBlockChange()}))
    accept("block_change", changedPos, acceptedView)
    const kept = acceptedView.state.doc.nodeAt(changedPos)
    assert.strictEqual(kept.type.name, "paragraph")
    assert.strictEqual(kept.attrs.track.length, 0)
})

console.log(`\ntracked-changes: ${passed} passed, ${failed} failed`)
if (failed) {
    process.exit(1)
}
