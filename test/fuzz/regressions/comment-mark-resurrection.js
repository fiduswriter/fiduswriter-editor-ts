// Regression test: deleting a comment with deleteComment(id, true) used to
// resurrect the comment's mark in the document.
//
// deleteComment removes the id from the store first, then removeCommentMarks
// dispatches one transaction that strips the mark everywhere:
//   - inline text via tr.removeMark -> a RemoveMarkStep,
//   - leaf nodes (e.g. horizontal_rule) via tr.setNodeMarkup -> a
//     ReplaceAroundStep.
// The comments plugin's appendTransaction scans every replace/replaceAround
// step of each transaction against the PRE-step document; the setNodeMarkup
// that merely removed the mark from the leaf is misread as "the comment's
// anchored content was deleted". Because the mark is gone from the resulting
// doc, the follow-up descendants scan cannot clear the id, and moveComment
// then re-added an AddMarkStep for a comment that no longer exists in the
// store — breaking the marks<->store invariant.
//
// The plugin now skips relocation for ids that are no longer in the store.
// Found by test/fuzz/comments.js (local comment lifecycle), seed 777002.
//
// Run: node test/fuzz/regressions/comment-mark-resurrection.js
import "../../setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"

import {ModCollabDoc} from "../../../dist/collab/doc.js"
import {
    makeFakeEditor,
    destroyFakeEditor,
    attachCollabDoc
} from "../fake-editor.js"

// title + one part: a paragraph with inline text followed by a
// horizontal_rule. A comment spanning both is marked on inline text AND on
// the leaf — the exact combination that triggered the resurrection.
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
                        type: "paragraph",
                        content: [{type: "text", text: "Hello world"}]
                    },
                    {type: "horizontal_rule"}
                ]
            }
        ]
    })
}

const commentMarks = doc => {
    const found = []
    doc.descendants((node, pos) => {
        node.marks.forEach(mark => {
            if (mark.type.name === "comment" && mark.attrs.id) {
                found.push({id: mark.attrs.id, pos, type: node.type.name})
            }
        })
    })
    return found
}

// 1. The regression: deleteComment(id, true) must remove both the store entry
//    and every mark — nothing may be relocated for a deleted comment.
{
    const editor = makeFakeEditor({doc: makeDoc(), clientID: "regress"})
    const mod = {editor}
    const collabDoc = new ModCollabDoc(mod)
    attachCollabDoc(editor, collabDoc)
    try {
        let textPos = -1,
            hrPos = -1
        editor.view.state.doc.descendants((node, pos) => {
            if (textPos === -1 && node.isText) {
                textPos = pos
            }
            if (hrPos === -1 && node.type.name === "horizontal_rule") {
                hrPos = pos
            }
        })
        assert.notStrictEqual(textPos, -1)
        assert.notStrictEqual(hrPos, -1)

        const store = editor.mod.comments.store
        store.addComment(
            {
                comment: "comment text",
                user: 1,
                username: "u1",
                date: 1755000000000,
                answers: []
            },
            textPos,
            hrPos + 1,
            editor.view
        )
        const ids = Object.keys(store.comments)
        assert.strictEqual(
            ids.length,
            1,
            "one comment should have been created"
        )
        const id = ids[0]
        const marks = commentMarks(editor.view.state.doc)
        assert.ok(
            marks.some(m => String(m.id) === id && m.type === "text"),
            "comment mark must be on the inline text"
        )
        assert.ok(
            marks.some(
                m => String(m.id) === id && m.type === "horizontal_rule"
            ),
            "comment mark must be on the horizontal_rule leaf"
        )

        store.deleteComment(id, true)

        editor.view.state.doc.check()
        assert.deepStrictEqual(
            commentMarks(editor.view.state.doc).filter(
                m => String(m.id) === id
            ),
            [],
            "comment mark must not be resurrected after deleteComment"
        )
        assert.strictEqual(
            Object.prototype.hasOwnProperty.call(store.comments, id),
            false,
            "store entry must be gone"
        )
    } finally {
        destroyFakeEditor(editor)
    }
}

// 2. The legitimate path must still work: deleting the text a comment is on
//    (comment still in the store) still relocates the mark.
{
    const editor = makeFakeEditor({doc: makeDoc(), clientID: "regress"})
    const mod = {editor}
    const collabDoc = new ModCollabDoc(mod)
    attachCollabDoc(editor, collabDoc)
    try {
        let textPos = -1,
            hrPos = -1
        editor.view.state.doc.descendants((node, pos) => {
            if (textPos === -1 && node.isText) {
                textPos = pos
            }
            if (hrPos === -1 && node.type.name === "horizontal_rule") {
                hrPos = pos
            }
        })

        const store = editor.mod.comments.store
        store.addComment(
            {
                comment: "comment text",
                user: 1,
                username: "u1",
                date: 1755000000000,
                answers: []
            },
            textPos,
            hrPos + 1,
            editor.view
        )
        const id = Object.keys(store.comments)[0]

        // Delete the whole paragraph + horizontal_rule without touching the
        // comment store — the plugin must move the comment (here: onto the
        // first title character).
        let partStart = -1,
            partEnd = -1
        editor.view.state.doc.descendants((node, pos) => {
            if (node.type.name === "richtext_part") {
                partStart = pos + 1
                partEnd = pos + node.nodeSize - 1
            }
        })
        const tr = editor.view.state.tr.delete(partStart, partEnd)
        editor.view.dispatch(tr)

        editor.view.state.doc.check()
        assert.ok(
            Object.prototype.hasOwnProperty.call(store.comments, id),
            "comment stays in the store"
        )
        const marks = commentMarks(editor.view.state.doc).filter(
            m => String(m.id) === id
        )
        assert.strictEqual(
            marks.length > 0,
            true,
            "comment mark must be relocated when the comment still exists"
        )
    } finally {
        destroyFakeEditor(editor)
    }
}

console.log("comment-mark-resurrection regressions passed")
