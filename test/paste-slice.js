// Regression tests for pasting content copied within the same document.
//
// Content copied from the same ProseMirror editor arrives wrapped in an
// ancestor section node (richtext_part etc.) - prosemirror-view records it in
// the data-pm-slice attribute of the clipboard HTML and wraps the content in
// it again while parsing. The clipboard plugin has to remove that wrapper and
// keep the openStart/openEnd depths of the slice consistent with its content,
// otherwise Transaction.replaceSelection crashes with
// "TypeError: Cannot read properties of null (reading 'lastChild')"
// in Selection.replace.
import "../test/setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {DOMParser, DOMSerializer, Fragment, Slice} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"

import {clipboardPlugin} from "../dist/state_plugins/clipboard.js"

// --- The following three helpers are copied verbatim from
// prosemirror-view's parseFromClipboard (they are not exported there). ---
function closeRange(fragment, side, from, to, depth, openEnd) {
    let node = side < 0 ? fragment.firstChild : fragment.lastChild,
        inner = node.content
    if (fragment.childCount > 1) openEnd = 0
    if (depth < to - 1) inner = closeRange(inner, side, from, to, depth + 1, openEnd)
    if (depth >= from)
        inner =
            side < 0
                ? node.contentMatchAt(0).fillBefore(inner, openEnd <= depth).append(inner)
                : inner.append(node.contentMatchAt(node.childCount).fillBefore(Fragment.empty, true))
    return fragment.replaceChild(side < 0 ? 0 : fragment.childCount - 1, node.copy(inner))
}

function closeSlice(slice, openStart, openEnd) {
    if (openStart < slice.openStart)
        slice = new Slice(
            closeRange(slice.content, -1, openStart, slice.openStart, 0, slice.openEnd),
            openStart,
            slice.openEnd
        )
    if (openEnd < slice.openEnd)
        slice = new Slice(closeRange(slice.content, 1, openEnd, slice.openEnd, 0, 0), slice.openStart, openEnd)
    return slice
}

function addContext(slice, context) {
    if (!slice.size) return slice
    let schema = slice.content.firstChild.type.schema,
        array
    try {
        array = JSON.parse(context)
    } catch (_error) {
        return slice
    }
    let {content, openStart, openEnd} = slice
    for (let i = array.length - 2; i >= 0; i -= 2) {
        let type = schema.nodes[array[i]]
        if (!type || type.hasRequiredAttrs()) break
        content = Fragment.from(type.create(array[i + 1], content))
        openStart++
        openEnd++
    }
    return new Slice(content, openStart, openEnd)
}

// --- Document mirroring the demo template ---
const strongMark = docSchema.marks.strong.create()
const para = children => docSchema.nodes.paragraph.create(null, Fragment.fromArray(children))
const text = (content, marks) => docSchema.text(content, marks)

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
    Fragment.fromArray([
        para([text("Applying", [strongMark]), text(" more")]),
        para([text("Second block "), text("bold2", [strongMark]), text(" end")])
    ])
)
const abstractPart = docSchema.nodes.richtext_part.create(
    {title: "Abstract", id: "abstract", marks: ["strong", "em", "link"]},
    Fragment.fromArray([para([text("Abstract ")])])
)
const baseDoc = docSchema.nodes.doc.create({}, Fragment.fromArray([
    docSchema.nodes.title.create(null, text("Title")),
    docSchema.nodes.contributors_part.create({id: "authors"}),
    abstractPart,
    bodyPart
]))

const plugin = clipboardPlugin({
    editor: {
        view: null,
        currentView: null,
        docInfo: {access_rights: "write"},
        mod: {db: {bibDB: {findReference: () => undefined, addReference: id => id}}},
        app: {csl: {}},
        schema: docSchema
    },
    viewType: "main"
})
const transformPasted = plugin.spec.props.transformPasted

const parser = DOMParser.fromSchema(docSchema)
const serializer = DOMSerializer.fromSchema(docSchema)

const POS = {}
baseDoc.descendants((node, pos) => {
    if (!node.isText) {
        return
    }
    if (node.text === "Applying") POS.applyStart = pos
    if (node.text === " more") POS.moreMid = pos + 2
    if (node.text === "Second block ") POS.p2mid = pos + 7
    if (node.text.startsWith("Abstract")) POS.abstractMid = pos + 4
})

// Reproduce serializeForClipboard (prosemirror-view).
function makeClipboardHTML(from, to) {
    const slice = baseDoc.slice(from, to, true)
    let context = [],
        {content, openStart, openEnd} = slice
    while (
        openStart > 1 &&
        openEnd > 1 &&
        content.childCount == 1 &&
        content.firstChild.childCount == 1
    ) {
        openStart--
        openEnd--
        const node = content.firstChild
        context.push(
            node.type.name,
            JSON.stringify(node.attrs) !== JSON.stringify(node.type.defaultAttrs) ? node.attrs : null
        )
        content = node.content
    }
    const wrap = document.createElement("div")
    wrap.appendChild(serializer.serializeFragment(content))
    wrap.firstElementChild.setAttribute(
        "data-pm-slice",
        `${openStart} ${openEnd} ${JSON.stringify(context)}`
    )
    return wrap.innerHTML
}

// Reproduce parseFromClipboard's PM-created-HTML branch (prosemirror-view).
function parseClipboardHTML(html, targetFrom) {
    const dom = document.createElement("div")
    dom.innerHTML = html
    const contextNode = dom.querySelector("[data-pm-slice]")
    const sliceData =
        contextNode &&
        /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(contextNode.getAttribute("data-pm-slice") || "")
    let workDom = dom
    if (sliceData && sliceData[3]) {
        for (let i = +sliceData[3]; i > 0; i--) {
            let child = workDom.firstChild
            while (child && child.nodeType != 1) child = child.nextSibling
            if (!child) break
            workDom = child
        }
    }
    let slice = parser.parseSlice(workDom, {
        preserveWhitespace: !!sliceData,
        context: baseDoc.resolve(targetFrom)
    })
    if (sliceData) {
        slice = addContext(closeSlice(slice, +sliceData[1], +sliceData[2]), sliceData[4])
    }
    return slice
}

let passed = 0,
    failed = 0

function scenario(label, copy, target, expectTextInDoc, expectStrongOnPastedText) {
    console.log(`\n=== ${label} ===`)
    // Same-document copy produces the wrapped slice...
    const html = makeClipboardHTML(copy[0], copy[1])
    const parsed = parseClipboardHTML(html, target[0])
    assert.strictEqual(
        parsed.content.firstChild?.type.name,
        "richtext_part",
        "same-document copies are expected to arrive wrapped in their section node"
    )

    const state = EditorState.create({
        doc: baseDoc,
        selection: TextSelection.create(baseDoc, target[0], target[1])
    })

    // ...which the plugin has to normalize into an insertable slice.
    const out = transformPasted.call(null, parsed, {state}, false)

    // The core invariant: open depths may never exceed the nesting depth of
    // the first/last content nodes. Violating slices crash Selection.replace.
    const chainDepth = (fragment, side) => {
        let depth = 0
        let node = side === "start" ? fragment.firstChild : fragment.lastChild
        while (node && !node.isLeaf) {
            depth++
            node = side === "start" ? node.firstChild : node.lastChild
        }
        return depth
    }
    assert.ok(
        out.openStart <= chainDepth(out.content, "start"),
        `openStart (${out.openStart}) exceeds content depth (${chainDepth(out.content, "start")})`
    )
    assert.ok(
        out.openEnd <= chainDepth(out.content, "end"),
        `openEnd (${out.openEnd}) exceeds content depth (${chainDepth(out.content, "end")})`
    )

    try {
        const tr = state.tr
        tr.replaceSelection(out)
        const insertPos = tr.mapping.map(target[0], -1)
        const whole = tr.doc.textBetween(0, tr.doc.content.size, "\u0000")
        assert.ok(
            whole.includes(expectTextInDoc),
            `expected ${JSON.stringify(expectTextInDoc)} in document after paste`
        )
        if (expectStrongOnPastedText !== null) {
            // Inspect the first text node overlapping the inserted range.
            // Pasted text may merge with equally formatted neighbors, so we
            // cannot look for a standalone text node.
            const endPos = tr.mapping.map(target[1], 1)
            let found = null
            tr.doc.nodesBetween(insertPos, Math.max(endPos, insertPos + 1), node => {
                if (found === null && node.isText && node.text?.length) {
                    found = node.marks.some(mark => mark.type.name === "strong")
                }
            })
            assert.strictEqual(found, expectStrongOnPastedText, "strong mark on pasted text")
        }
        passed++
        console.log(`  OK`)
    } catch (error) {
        failed++
        console.log(`  FAILED: ${error.message}`)
    }
}

// The exact user report: copy characters from inside a bold word, paste them
// between two characters of that same word, tracked changes enabled or not.
scenario(
    "copy from bold word, paste into middle of bold word",
    [POS.applyStart + 2, POS.applyStart + 5],
    [POS.applyStart + 3, POS.applyStart + 3],
    "ppl",
    true
)
scenario(
    "copy bold text, paste into plain text",
    [POS.applyStart + 1, POS.applyStart + 2],
    [POS.moreMid, POS.moreMid],
    "p",
    true
)
scenario(
    "copy plain text, paste into middle of marked text",
    [POS.moreMid - 1, POS.moreMid + 3],
    [POS.applyStart + 3, POS.applyStart + 3],
    "more",
    false
)
scenario(
    "copy across block boundaries, paste into a paragraph",
    [POS.applyStart, POS.p2mid],
    [POS.moreMid, POS.moreMid],
    "Second",
    null
)
scenario(
    "copy within body part, paste into another part",
    [POS.moreMid, POS.moreMid + 4],
    [POS.abstractMid, POS.abstractMid],
    "more",
    null
)
scenario(
    "copy whole word, paste over selected text",
    [POS.applyStart, POS.applyStart + 8],
    [POS.moreMid, POS.moreMid + 2],
    "Applying",
    null
)

// Guard documenting the original bug: rebuilding the slice the way
// transformPasted did before the fix (flattened content, unchanged open
// depths) must crash Transaction.replaceSelection.
{
    const malformed = new Slice(Fragment.from(text("x")), 2, 2)
    const state = EditorState.create({
        doc: baseDoc,
        selection: TextSelection.create(baseDoc, POS.moreMid, POS.moreMid)
    })
    assert.throws(
        () => state.tr.replaceSelection(malformed),
        error =>
            error instanceof TypeError &&
            error.message.includes("lastChild"),
        "stale open depths on flattened content are expected to crash Selection.replace"
    )
    console.log("\n=== regression guard (old buggy behavior crashes) === OK")
    passed++
}

console.log(`\npaste-slice: ${passed} passed, ${failed} failed`)
if (failed) {
    process.exit(1)
}
