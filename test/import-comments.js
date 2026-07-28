import "../test/setup.js"
import assert from "node:assert"
import fs from "fs"

import {FidusFileImporter} from "@fiduswriter/document/importer/native"

const fileBuffer = fs.readFileSync("./demo/static/demo.fidus")
const file = new File([fileBuffer], "demo.fidus", {
    type: "application/fidus+zip"
})

const backend = {
    createDoc: async () => ({id: 1, path: "demo", e2ee: false}),
    saveImages: async images => {
        const table = {}
        Object.keys(images.db).forEach(id => {
            table[id] = Number(id)
        })
        return table
    },
    saveDocument: async () => ({added: Date.now(), updated: Date.now()})
}

const importer = new FidusFileImporter(
    file,
    {id: 1, username: "demo", name: "Demo", is_authenticated: true},
    "demo",
    backend,
    {e2eeOptions: null}
)
const result = await importer.init()
assert.strictEqual(result.ok, true, "import should succeed")
assert.ok(result.doc?.comments, "imported doc should include comments")
assert.ok(
    Object.keys(result.doc.comments).length > 0,
    "imported doc should have at least one comment"
)
console.log("import comments test passed")
