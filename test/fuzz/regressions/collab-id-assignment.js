// Regression test: the links plugin used to assign freshly generated random
// ids to every id-less heading/figure/table/list in the whole document on
// any local edit. Two collaborators editing concurrently each assigned
// different random ids to the same untouched nodes; the exchanged
// setNodeMarkup steps last-writer-win, so the two clients' documents
// permanently disagreed on node ids (breaking cross-references and internal
// links, and failing convergence).
//
// Now ids are only assigned inside the ranges the triggering transactions
// changed. Found by test/fuzz/recreate-merge.js (rebase swap symmetry).
//
// Run: node test/fuzz/regressions/collab-id-assignment.js
import "../../setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"

import {makeFakeEditor, destroyFakeEditor} from "../fake-editor.js"

// doc: title + two parts. Part 0 holds an id-less ordered_list followed by
// an id-less table (a setNodeMarkup over the list spans its whole extent
// and overlaps the table); part 1 a paragraph to edit.
function makeDoc() {
    return docSchema.nodeFromJSON({
        type: "doc",
        attrs: {template: "Regressions"},
        content: [
            {type: "title", content: [{type: "text", text: "Title"}]},
            {
                type: "richtext_part",
                attrs: {id: "part0", title: "Part 0"},
                content: [
                    {
                        type: "ordered_list",
                        content: [
                            {
                                type: "list_item",
                                content: [{type: "paragraph", content: []}]
                            }
                        ]
                    },
                    {
                        type: "table",
                        content: [
                            {type: "table_caption"},
                            {
                                type: "table_body",
                                content: [
                                    {
                                        type: "table_row",
                                        content: [
                                            {
                                                type: "table_cell",
                                                content: [{type: "paragraph"}]
                                            }
                                        ]
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
                        type: "paragraph",
                        content: [{type: "text", text: "Hello world"}]
                    }
                ]
            }
        ]
    })
}

const listId = doc => {
    let id
    doc.descendants(node => {
        if (node.type.name === "ordered_list") {
            id = node.attrs.id
        }
    })
    return id
}

const tableIds = doc => {
    const ids = []
    doc.descendants(node => {
        if (node.type.name === "table") {
            ids.push(node.attrs.id)
        }
    })
    return ids
}

// A local edit far away from the id-less list must not assign it an id:
// the same id-less list exists on every collaborator, and independent
// random assignments can never converge.
{
    const editor = makeFakeEditor({doc: makeDoc(), clientID: "regress"})
    try {
        let textPos = -1
        editor.view.state.doc.descendants((node, pos) => {
            if (
                textPos === -1 &&
                node.isText &&
                node.text.startsWith("Hello world")
            ) {
                textPos = pos
            }
        })
        const tr = editor.view.state.tr.insertText("X", textPos)
        tr.setMeta("linkUpdate", {foundAnchorWithoutId: false})
        editor.view.dispatch(tr)
        assert.strictEqual(
            listId(editor.view.state.doc),
            false,
            "untouched id-less list must not receive a random id"
        )
    } finally {
        destroyFakeEditor(editor)
    }
}

// Assigning a new id to the ordered_list (a setNodeMarkup spanning the
// whole list node) must not touch the neighboring id-less table that
// merely overlaps the changed range — only nodes created by the
// transaction (absent in oldState) may be randomized, or two
// collaborators assign different ids to the same old node and diverge.
{
    const editor = makeFakeEditor({doc: makeDoc(), clientID: "regress"})
    try {
        let listPos = -1
        editor.view.state.doc.descendants((node, pos) => {
            if (listPos === -1 && node.type.name === "ordered_list") {
                listPos = pos
            }
        })
        const tr = editor.view.state.tr
        tr.setNodeMarkup(listPos, null, {id: "fixed-list-id"})
        tr.setMeta("linkUpdate", {foundAnchorWithoutId: false})
        editor.view.dispatch(tr)
        assert.strictEqual(
            listId(editor.view.state.doc),
            "fixed-list-id",
            "the explicitly retagged list keeps its id"
        )
        const ids = tableIds(editor.view.state.doc)
        assert.strictEqual(
            ids[0],
            false,
            "old id-less table overlapping the changed range must not be randomized"
        )
    } finally {
        destroyFakeEditor(editor)
    }
}

// A local edit that changes a paragraph into a heading (inside the changed
// range) DOES get an id assigned — that is the feature.
{
    const editor = makeFakeEditor({doc: makeDoc(), clientID: "regress"})
    try {
        let paragraphPos = -1
        editor.view.state.doc.descendants((node, pos) => {
            if (
                paragraphPos === -1 &&
                node.type.name === "paragraph" &&
                node.textContent === "Hello world"
            ) {
                paragraphPos = pos
            }
        })
        const tr = editor.view.state.tr
        tr.setNodeMarkup(paragraphPos, docSchema.nodes.heading2)
        tr.setMeta("linkUpdate", {foundAnchorWithoutId: false})
        editor.view.dispatch(tr)
        let headingId
        editor.view.state.doc.descendants(node => {
            if (node.type.name === "heading2") {
                headingId = node.attrs.id
            }
        })
        assert.strictEqual(
            typeof headingId === "string" && headingId.length > 0,
            true,
            "newly created heading inside the changed range must receive an id"
        )
    } finally {
        destroyFakeEditor(editor)
    }
}

console.log("collab-id-assignment regressions passed")
