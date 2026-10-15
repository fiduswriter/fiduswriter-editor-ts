// Regression test: concurrent edits of two disjoint document parts could end
// with the two clients disagreeing on a table's cell count.
//
// The fidus schema allows schema-valid ragged tables (table_row is
// `table_cell+`, so rows may have differing cell counts) and `table_body` is
// derived from prosemirror-tables' generated table node spec, which carries
// `tableRole: "table"`. prosemirror-tables' `tableEditing` therefore
// normalizes `table_body` (pads short rows) — but only for tables that
// happen to fall into the range `changedDescendants` reports as changed, and
// that depends on the transaction *shape* (node identity alignment windows),
// not on the transaction content.
//
// The fuzz counterexample (recreate-merge.js, seed 777003): part 0 holds a
// ragged table. Client A splits part 0 at its content start; client B splits
// a heading in part 1. When A then merges B's steps, the remote receive
// transaction undoes and re-applies A's own split, which leaves the changed
// range misaligned over part 0's (empty first copy vs full second copy)
// child positions — the full part's children (including the table) are then
// visited as "changed" and tableEditing pads the short row. B's merge
// transaction aligns the children identity-perfectly, so nothing is visited
// and nothing is padded. A ends up [2,2], B stays [2,1]: swap symmetry is
// violated.
//
// The fix wraps `tableEditing` (`src/state_plugins/table_editing.ts`): table
// normalization no longer runs when every triggering transaction is remote.
// Local edits still normalize (those steps converge through the normal
// rebase machinery).
//
// Run: node test/fuzz/regressions/table-swap-symmetry.js
import "../../setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {sendableSteps} from "prosemirror-collab"
import {Step, Transform} from "prosemirror-transform"

import {ModCollabDoc} from "../../../dist/collab/doc.js"
import {
    createRemoteTransaction,
    getRemoteSteps
} from "../../../dist/no_collab_save/merge.js"
import {
    makeFakeEditor,
    destroyFakeEditor,
    attachCollabDoc
} from "../fake-editor.js"

// title + two parts. Part 0: a horizontal rule, a paragraph and a ragged
// table (rows with 2 and 1 cells). Part 1: a heading5 that client B splits.
function makeDoc() {
    const cell = () => ({
        type: "table_cell",
        content: [{type: "paragraph"}]
    })
    return docSchema.nodeFromJSON({
        type: "doc",
        attrs: {template: "Regressions"},
        content: [
            {type: "title", content: [{type: "text", text: "Title"}]},
            {
                type: "richtext_part",
                attrs: {id: "part0", title: "Part 0"},
                content: [
                    {type: "horizontal_rule"},
                    {
                        type: "paragraph",
                        content: [{type: "text", text: "Hello world"}]
                    },
                    {
                        type: "table",
                        content: [
                            {type: "table_caption", content: []},
                            {
                                type: "table_body",
                                content: [
                                    {
                                        type: "table_row",
                                        content: [cell(), cell()]
                                    },
                                    {
                                        type: "table_row",
                                        content: [cell()]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                type: "richtext_part",
                attrs: {id: "part1", title: "Part 1"},
                content: [
                    {
                        type: "heading5",
                        content: [{type: "text", text: "Heading one"}]
                    }
                ]
            }
        ]
    })
}

function applyStepsJson(fromDoc, stepJsons) {
    const tr = new Transform(fromDoc)
    for (const json of stepJsons) {
        tr.step(Step.fromJSON(docSchema, json))
    }
    return tr.doc
}

function partRanges(doc) {
    const ranges = []
    doc.forEach((node, offset) => {
        if (node.type.name === "richtext_part") {
            ranges.push({from: offset + 1, to: offset + node.content.size})
        }
    })
    return ranges
}

function tableBodyRows(doc) {
    const rows = []
    doc.descendants(node => {
        if (node.type.name === "table_body") {
            rows.push(
                Array.from(
                    {length: node.childCount},
                    (_, r) => node.child(r).childCount
                )
            )
        }
    })
    return rows
}

function makeCollabClient(baseDoc, clientID) {
    const editor = makeFakeEditor({doc: baseDoc, clientID})
    const mod = {editor}
    const doc = new ModCollabDoc(mod)
    attachCollabDoc(editor, doc)
    return {editor, mod, doc}
}

// --- 1. swap symmetry of the disjoint edits must converge ------------------

{
    const baseDoc = makeDoc()
    const ranges = partRanges(baseDoc)
    assert.strictEqual(ranges.length, 2)
    const clientA = makeCollabClient(baseDoc, "regress-a")
    const clientB = makeCollabClient(baseDoc, "regress-b")
    try {
        // A splits part 0 between its horizontal rule and the paragraph
        // (the fuzz counterexample's split(9): part 0 becomes [hr] followed
        // by [paragraph, table]).
        const trA = clientA.editor.view.state.tr.split(ranges[0].from + 1, 1)
        clientA.editor.view.dispatch(trA)

        // B splits the heading in part 1 at its content start (split(139)).
        let headingPos = -1
        clientB.editor.view.state.doc.descendants((node, pos) => {
            if (headingPos === -1 && node.type.name === "heading5") {
                headingPos = pos
            }
        })
        assert.notStrictEqual(headingPos, -1)
        const trB = clientB.editor.view.state.tr.split(headingPos + 1, 1)
        clientB.editor.view.dispatch(trB)

        const aStepJsons = sendableSteps(clientA.editor.view.state).steps.map(
            step => step.toJSON()
        )
        const bStepJsons = sendableSteps(clientB.editor.view.state).steps.map(
            step => step.toJSON()
        )
        const serverDocA = applyStepsJson(baseDoc, aStepJsons)
        const serverDocB = applyStepsJson(baseDoc, bStepJsons)

        // B merges A's saved document; A merges B's saved document.
        const remoteForB = getRemoteSteps(
            docSchema,
            baseDoc,
            serverDocA,
            aStepJsons.map(json => ({ds: [json], cid: "regress-a"}))
        )
        clientB.editor.view.dispatch(
            createRemoteTransaction(
                clientB.editor.view.state,
                remoteForB.steps,
                remoteForB.clientIds
            )
        )
        clientB.editor.view.state.doc.check()

        const remoteForA = getRemoteSteps(
            docSchema,
            baseDoc,
            serverDocB,
            bStepJsons.map(json => ({ds: [json], cid: "regress-b"}))
        )
        clientA.editor.view.dispatch(
            createRemoteTransaction(
                clientA.editor.view.state,
                remoteForA.steps,
                remoteForA.clientIds
            )
        )
        clientA.editor.view.state.doc.check()

        const docA = clientA.editor.view.state.doc
        const docB = clientB.editor.view.state.doc
        assert.deepStrictEqual(
            tableBodyRows(docA),
            tableBodyRows(docB),
            "table rows must not diverge between the merge orders"
        )
        assert.strictEqual(
            docA.eq(docB),
            true,
            "both merge orders must converge to the same document"
        )
    } finally {
        destroyFakeEditor(clientA.editor)
        destroyFakeEditor(clientB.editor)
    }
}

// --- 2. local edits must still normalize the ragged table ------------------

{
    const baseDoc = makeDoc()
    const editor = makeFakeEditor({doc: baseDoc, clientID: "regress-local"})
    const mod = {editor}
    const collabDoc = new ModCollabDoc(mod)
    attachCollabDoc(editor, collabDoc)
    try {
        // A local edit whose changed range covers the table: tableEditing's
        // normalization must still pad the short row. Inserting into the
        // empty paragraph of the first cell puts the table in the changed
        // range, so the ragged [2,1] table is normalized to [2,2].
        let cellPos = -1
        editor.view.state.doc.descendants((node, pos) => {
            if (cellPos === -1 && node.type.name === "table_cell") {
                cellPos = pos
            }
        })
        assert.notStrictEqual(cellPos, -1)
        // cell open token, then the paragraph's open token: the paragraph's
        // (empty) content starts two positions in.
        editor.view.dispatch(editor.view.state.tr.insertText("!", cellPos + 2))
        editor.view.state.doc.check()
        assert.deepStrictEqual(
            tableBodyRows(editor.view.state.doc),
            [[2, 2]],
            "a local edit covering a ragged table must still trigger normalization"
        )
    } finally {
        destroyFakeEditor(editor)
    }
}

console.log("table-swap-symmetry regressions passed")
