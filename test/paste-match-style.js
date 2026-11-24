// Regression test for https://github.com/fiduswriter/fiduswriter/issues/1420
//
// "Paste and match style" (Shift-Cmd-V on macOS, Shift-Ctrl-V elsewhere)
// delivers plain text, so the paste takes the shiftPressed shortcut in the
// clipboard plugin's transformPastedText/transformPastedHTML and bypasses
// the HTML/Text paste pipelines - which are what normally clear the
// plugin's pasteRange after a paste. The stale pasteRange made every
// subsequent paste look like an interrupting paste and got it cancelled
// silently (both keyboard and context menu), until the previously pasted
// text was deleted or the page was reloaded.
import "./setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {Fragment} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"

import {clipboardPlugin} from "../dist/state_plugins/clipboard.js"
import {getPasteRange} from "../dist/state_plugins/clipboard.js"

const text = content => docSchema.text(content)
const paragraph = content =>
    docSchema.nodes.paragraph.create(
        null,
        Fragment.fromArray(Array.isArray(content) ? content : [text(content)])
    )

const baseDoc = docSchema.nodes.doc.create(null, [
    docSchema.nodes.title.create(null, text("Title")),
    docSchema.nodes.richtext_part.create(null, paragraph("Hello world"))
])

const plugin = clipboardPlugin({
    editor: {
        view: null,
        currentView: null,
        docInfo: {access_rights: "write"},
        mod: {
            db: {
                bibDB: {findReference: () => undefined, addReference: id => id}
            }
        },
        app: {csl: {}},
        schema: docSchema
    },
    viewType: "main"
})
const props = plugin.spec.props

const tick = () => new Promise(resolve => setTimeout(resolve, 10))

let selPos = 0
baseDoc.descendants((node, pos) => {
    if (node.isText && node.text === "Hello world") {
        selPos = pos + 5
    }
})

const run = async () => {
    const state = EditorState.create({
        doc: baseDoc,
        plugins: [plugin],
        selection: TextSelection.create(baseDoc, selPos, selPos)
    })
    const view = {
        state,
        dispatch(tr) {
            this.state = this.state.apply(tr)
        }
    }

    // Paste #1: "paste and match style" - the last keydown had Shift pressed
    // and the clipboard holds plain text only.
    props.handleKeyDown(view, {shiftKey: true})
    const out1 = props.transformPastedText("matched text", false, view)
    assert.strictEqual(
        out1,
        "matched text",
        "match-style paste text passes through"
    )
    // The browser now performs the paste; ProseMirror tags the resulting
    // transaction with the "paste" uiEvent, which records the pasteRange.
    const tr1 = view.state.tr
        .setMeta("uiEvent", "paste")
        .insertText("matched text")
    view.dispatch(tr1)
    assert.ok(
        getPasteRange(view.state),
        "paste range recorded while the paste is being processed"
    )

    await tick()

    assert.strictEqual(
        getPasteRange(view.state),
        null,
        "paste range cleared once the match-style paste has been applied"
    )

    // Paste #2: another paste (also match-style). With a stale pasteRange
    // the plugin mistakes it for an interrupting paste and cancels it by
    // returning "", which is what broke all pasting after the first
    // match-style paste.
    props.handleKeyDown(view, {shiftKey: true})
    const out2 = props.transformPastedText("second paste", false, view)
    assert.strictEqual(
        out2,
        "second paste",
        "a later paste is not cancelled by the previous paste's stale range"
    )

    const tr2 = view.state.tr
        .setMeta("uiEvent", "paste")
        .insertText("second paste")
    view.dispatch(tr2)
    await tick()
    assert.strictEqual(getPasteRange(view.state), null)
    assert.ok(
        view.state.doc.textContent.includes("second paste"),
        "second paste reached the document"
    )

    console.log("paste-match-style: all assertions passed")
}

run().catch(error => {
    console.error(error)
    process.exit(1)
})
