import "../test/setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"

import {ContributorDialog} from "../dist/dialogs/contributor.js"

const schema = docSchema

const doc = schema.nodeFromJSON({
    type: "doc",
    attrs: {
        template: "Standard Article",
        import_id: "standard-article"
    },
    content: [
        {type: "title"},
        {
            type: "contributors_part",
            attrs: {
                title: "Authors",
                id: "authors",
                item_title: "Author"
            }
        },
        {
            type: "richtext_part",
            attrs: {id: "body", title: "Body"},
            content: [{type: "paragraph"}]
        }
    ]
})

const state = EditorState.create({schema, doc})

const dispatched = []
const view = new EditorView(document.createElement("div"), {
    state,
    dispatchTransaction(tr) {
        dispatched.push(tr)
        this.updateState(this.state.apply(tr))
    }
})

const contributorsPart = doc.child(1)
assert.ok(contributorsPart, "doc should have a contributors_part")
assert.strictEqual(contributorsPart.type.name, "contributors_part")

const dialog = new ContributorDialog(contributorsPart, view)

// The previous bug caused init() to throw when building the Add button
// because this.dialog was still false.
assert.doesNotThrow(() => dialog.init(), "init should not throw")

const dialogEl = document.querySelector("#edit-contributor")
assert.ok(dialogEl, "dialog element should be rendered")

const firstnameInput = dialogEl.querySelector("input[name=firstname]")
const lastnameInput = dialogEl.querySelector("input[name=lastname]")
assert.ok(firstnameInput, "firstname input should exist")
assert.ok(lastnameInput, "lastname input should exist")

firstnameInput.value = "Test"
lastnameInput.value = "Author"

const addButton = Array.from(document.querySelectorAll("button")).find(
    button => button.textContent.trim() === "Add"
)
assert.ok(addButton, "Add button should exist")

addButton.click()

assert.strictEqual(
    dispatched.length,
    1,
    "clicking Add should dispatch a transaction"
)

console.log("contributor dialog test passed")
