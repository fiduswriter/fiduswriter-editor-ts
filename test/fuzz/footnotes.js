// Fuzz harness for the footnote editor sync: the main document's footnote
// markers and the separate footnote editor document must stay consistent
// under random edits on both sides. Uses the REAL ModFootnoteEditor with its
// production plugin set, and replicates the production main-view
// dispatchTransaction (amendTransaction + footTr forwarding) verbatim.
//
// Invariants:
//  1. After footnote-editor edits, the main document's footnote markers
//     contain exactly the footnote editor's children.
//  2. After main-document edits (deleting/inserting footnote markers,
//     editing text), the footnote editor doc follows the markers.
//  3. Nothing throws; both documents stay check-valid.

import "../setup.js"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {fnSchema} from "@fiduswriter/document/schema/footnotes"
import {getFootnoteMarkerContents} from "../../dist/state_plugins/index.js"
import {amendTransaction} from "../../dist/track/index.js"
import {ModFootnoteEditor} from "../../dist/footnotes/editor.js"

import {fc, runHarness} from "./config.js"
import {docArb, makeRng} from "./doc-generator.js"
import {
    makeFakeEditor,
    destroyFakeEditor,
    attachCollabDoc
} from "./fake-editor.js"
import {randomEdit} from "./edits.js"
import {ModCollabDoc} from "../../dist/collab/doc.js"

// Production main-view dispatchTransaction (src/index.ts), replicated:
// applies through amendTransaction and forwards the footnote markers
// plugin's footTr to the footnote editor.
function makeProductionDispatch(editor) {
    const view = editor.view
    view.dispatch = tr => {
        const trackedTr = amendTransaction(tr, view.state, editor)
        const {state: newState, transactions} =
            view.state.applyTransaction(trackedTr)
        view.updateState(newState)
        transactions.forEach(subTr => {
            const footTr = subTr.getMeta("footTr")
            if (footTr && footTr.steps.length) {
                editor.mod.footnotes.fnEditor.view.dispatch(footTr)
            }
        })
    }
}

function setUpEditor(baseSeed) {
    const {doc: baseDoc} = fc.sample(docArb(fc), {
        seed: baseSeed,
        numRuns: 1
    })[0]
    const editor = makeFakeEditor({doc: baseDoc, clientID: "fn-client"})
    const mod = {editor}
    const collabDoc = new ModCollabDoc(mod)
    attachCollabDoc(editor, collabDoc)
    // Replace the stub footnote editor with the real one.
    const container = document.createElement("div")
    container.id = "footnote-box-container-fuzz"
    document.body.appendChild(container)
    const fnEditor = new ModFootnoteEditor({
        editor,
        layout: {updateDOM() {}}
    })
    fnEditor.init()
    fnEditor.renderAllFootnotes()
    editor.mod.footnotes.fnEditor = fnEditor
    makeProductionDispatch(editor)
    return {editor, fnEditor, container}
}

function fnContents(editor) {
    return getFootnoteMarkerContents(editor.view.state)
}

function fnDocChildren(fnEditor) {
    const children = []
    fnEditor.view.state.doc.forEach(child => children.push(child))
    return children
}

function assertSynced(editor, fnEditor, context) {
    try {
        editor.view.state.doc.check()
    } catch (error) {
        error.message = `invalid main doc after ${context}: ${error.message}`
        throw error
    }
    try {
        fnEditor.view.state.doc.check()
    } catch (error) {
        error.message = `invalid footnote doc after ${context}: ${error.message}`
        throw error
    }
    const markers = fnContents(editor)
    const children = fnDocChildren(fnEditor)
    if (markers.length !== children.length) {
        throw new Error(
            `footnote count desync after ${context}: ${markers.length} markers vs ${children.length} footnote editor children`
        )
    }
    for (let i = 0; i < markers.length; i++) {
        // Compare through the fn schema so default attrs (e.g. track: [])
        // are normalized on both sides.
        const fromMarker = fnSchema.nodeFromJSON({
            type: "footnotecontainer",
            content: markers[i]
        })
        if (!fromMarker.eq(children[i])) {
            throw new Error(
                `footnote ${i} content desync after ${context}:\n--- marker ---\n${JSON.stringify(markers[i]).slice(0, 400)}\n--- footnote editor ---\n${JSON.stringify(children[i].toJSON().content).slice(0, 400)}`
            )
        }
    }
}

// --- Property 1: footnote editor edits propagate to the markers ------------

const fnEditsProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 4}),
    (baseSeed, editCount) => {
        const setup = setUpEditor(baseSeed)
        const {editor, fnEditor} = setup
        try {
            assertSynced(editor, fnEditor, "initial render")
            const rng = makeRng(baseSeed ^ (editCount * 7919))
            for (let i = 0; i < editCount; i++) {
                const fnState = fnEditor.view.state
                if (fnState.doc.content.size < 2) {
                    break
                }
                const pos = rng.int(1, fnState.doc.content.size - 1)
                const roll = rng.int(0, 2)
                try {
                    if (roll === 0) {
                        fnEditor.view.state.apply(
                            fnState.tr.insertText("fz", pos, pos)
                        )
                        fnEditor.view.dispatch(
                            fnState.tr.insertText("fz", pos, pos)
                        )
                    } else if (roll === 1) {
                        fnEditor.view.dispatch(
                            fnState.tr.insertText("ö😀", pos, pos)
                        )
                    } else {
                        fnEditor.view.dispatch(
                            fnState.tr.delete(
                                pos,
                                Math.min(fnState.doc.content.size, pos + 2)
                            )
                        )
                    }
                } catch (error) {
                    error.message = `footnote edit ${i} (roll ${roll}, pos ${pos}) threw: ${error.message}`
                    throw error
                }
                assertSynced(editor, fnEditor, `footnote edit ${i}`)
            }
        } finally {
            destroyFakeEditor(editor)
            if (setup.container.parentNode) {
                setup.container.parentNode.removeChild(setup.container)
            }
        }
    }
)

// --- Property 2: main document edits keep the footnote editor in step ------

const mainEditsProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 4}),
    (baseSeed, editCount) => {
        const setup = setUpEditor(baseSeed)
        const {editor, fnEditor} = setup
        try {
            assertSynced(editor, fnEditor, "initial render")
            const rng = makeRng(baseSeed ^ (editCount * 104729))
            for (let i = 0; i < editCount; i++) {
                const state = editor.view.state
                const roll = rng.int(0, 2)
                try {
                    if (roll === 0) {
                        // Delete a footnote marker if one exists.
                        let markerPos = -1
                        state.doc.descendants((node, pos) => {
                            if (
                                markerPos === -1 &&
                                node.type.name === "footnote"
                            ) {
                                markerPos = pos
                            }
                        })
                        if (markerPos === -1) {
                            continue
                        }
                        editor.view.dispatch(
                            state.tr.delete(markerPos, markerPos + 1)
                        )
                    } else if (roll === 1) {
                        // Insert a footnote marker.
                        const edit = randomEdit(state, rng.int(1, 2 ** 31 - 1))
                        if (!edit) {
                            continue
                        }
                        editor.view.dispatch(edit.tr)
                    } else {
                        // Insert a fresh footnote with content.
                        let insertPos = -1
                        state.doc.descendants((node, pos) => {
                            if (insertPos === -1 && node.isText) {
                                insertPos = pos
                            }
                        })
                        if (insertPos === -1) {
                            continue
                        }
                        const footnote = docSchema.nodes.footnote.create({
                            footnote: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {type: "text", text: "new footnote"}
                                    ]
                                }
                            ]
                        })
                        editor.view.dispatch(
                            state.tr.insert(insertPos, footnote)
                        )
                    }
                } catch (error) {
                    error.message = `main edit ${i} (roll ${roll}) threw: ${error.message}`
                    throw error
                }
                assertSynced(editor, fnEditor, `main edit ${i}`)
            }
        } finally {
            destroyFakeEditor(editor)
            if (setup.container.parentNode) {
                setup.container.parentNode.removeChild(setup.container)
            }
        }
    }
)

runHarness("footnotes", [
    {label: "footnote editor edits propagate to markers", prop: fnEditsProp},
    {label: "main edits keep footnote editor in step", prop: mainEditsProp}
])
