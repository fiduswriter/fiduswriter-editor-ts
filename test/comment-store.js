import "../test/setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {EditorState, TextSelection} from "prosemirror-state"

import {commentsPlugin} from "../dist/state_plugins/comments.js"
import {ModCommentStore} from "../dist/comments/store.js"

const schema = docSchema

const editor = {
    user: {id: 1, username: "demo_user"},
    clientTimeAdjustment: 0,
    docInfo: {access_rights: "write"},
    mod: {}
}
editor.mod.comments = {store: null, interactions: {}}

const state = EditorState.create({
    schema,
    doc: schema.nodeFromJSON({
        type: "doc",
        attrs: {template: "Standard Article", import_id: "standard-article"},
        content: [
            {type: "title"},
            {
                type: "richtext_part",
                attrs: {id: "body", title: "Body"},
                content: [
                    {
                        type: "paragraph",
                        content: [{type: "text", text: "Hello world"}]
                    }
                ]
            }
        ]
    }),
    plugins: [commentsPlugin({editor})]
})

const tr = state.tr.setSelection(TextSelection.create(state.doc, 5, 10))
const newState = state.apply(tr)

const view = {
    state: newState,
    dispatch(tr) {
        this.state = newState.apply(tr)
    }
}

const store = new ModCommentStore({
    editor,
    interactions: {
        isCurrentlyEditing: () => false,
        activeCommentId: false,
        activateComment: () => {}
    }
})

store.addCommentDuringCreation(view)

assert.strictEqual(
    store.commentDuringCreation !== false,
    true,
    "commentDuringCreation should be set"
)
assert.strictEqual(
    store.commentDuringCreation.comment.isGlobal,
    false,
    "new comment during creation should not be global"
)

console.log("comment store test passed")
