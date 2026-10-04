// Tests for addHostFileMenuItems, which splices host-provided entries into the
// editor's File menu. Run as a plain node script, like
// no-collab-save-scheduling.js, because the helper is pure and lives in its own
// module, free of the editor's DOM dependencies.
//
// A host without a Fidus Writer backend owns the document lifecycle — which file
// is open, where it is saved, what "New" means — so the editor cannot supply
// Open, Save as or New itself. This is how those end up in the editor's own menu
// instead of a separate toolbar bolted onto the page.
import assert from "node:assert"

import {addHostFileMenuItems} from "../dist/menus/headerbar/host_items.js"

let failures = 0

function test(name, fn) {
    try {
        fn()
        console.log(`OK ${name}`)
    } catch (error) {
        failures++
        console.error(`not ok ${name}`)
        console.error(`  ${error.message}`)
    }
}

process.on("exit", () => {
    if (failures) {
        console.error(`${failures} failing`)
        process.exitCode = 1
    }
})

/** A minimal built model with a File menu holding the given entry ids. */
function modelWithFileMenu(ids = ["share", "export"]) {
    return {
        content: [
            {
                id: "file",
                title: "File",
                content: ids.map(id => ({id, type: "action", title: id}))
            },
            {
                id: "edit",
                title: "Edit",
                content: [{id: "undo", type: "action"}]
            }
        ]
    }
}

const noop = () => {}

test("host entries are prepended so they sit at the top of the File menu", () => {
    const model = modelWithFileMenu()
    addHostFileMenuItems(model, [{id: "fw_open", title: "Open…", action: noop}])
    const file = model.content[0]
    assert.equal(file.content[0].id, "fw_open")
    // The built-in entries are still there, after ours.
    assert.deepEqual(
        file.content.slice(1).map(i => i.id),
        ["share", "export"]
    )
})

test("entries default to type 'action' so the view treats them as actions", () => {
    const model = modelWithFileMenu()
    addHostFileMenuItems(model, [{id: "x", title: "X", action: noop}])
    assert.equal(model.content[0].content[0].type, "action")
})

test("other menus are untouched", () => {
    const model = modelWithFileMenu()
    addHostFileMenuItems(model, [{id: "x", title: "X", action: noop}])
    assert.deepEqual(
        model.content[1].content.map(i => i.id),
        ["undo"]
    )
})

test("a matching id replaces the entry rather than duplicating it", () => {
    // A host that rebuilds its menu must not accumulate copies.
    const model = modelWithFileMenu(["share", "export"])
    addHostFileMenuItems(model, [
        {id: "share", title: "Share (local)", action: noop}
    ])
    const file = model.content[0]
    assert.equal(file.content.filter(i => i.id === "share").length, 1)
    assert.deepEqual(
        file.content.map(i => i.id),
        ["share", "export"]
    )
})

test("title and action are passed through unchanged", () => {
    const model = modelWithFileMenu()
    let ran = 0
    addHostFileMenuItems(model, [
        {
            id: "x",
            title: editor => `Open ${editor.docInfo.title}`,
            action: () => {
                ran++
            }
        }
    ])
    const item = model.content[0].content[0]
    assert.equal(typeof item.title, "function")
    assert.equal(item.title({docInfo: {title: "Doc"}}), "Open Doc")
    item.action({})
    assert.equal(ran, 1)
})

test("available/disabled/icon are carried through", () => {
    const model = modelWithFileMenu()
    addHostFileMenuItems(model, [
        {
            id: "x",
            title: "X",
            action: noop,
            icon: "fa-folder-open",
            available: () => true,
            disabled: () => false
        }
    ])
    const item = model.content[0].content[0]
    assert.equal(item.icon, "fa-folder-open")
    assert.equal(item.available(), true)
    assert.equal(item.disabled(), false)
})

test("an empty or missing list leaves the model exactly as it was", () => {
    for (const items of [undefined, []]) {
        const model = modelWithFileMenu()
        const before = JSON.stringify(model)
        addHostFileMenuItems(model, items)
        assert.equal(JSON.stringify(model), before)
    }
})

test("a model with no File menu is left alone", () => {
    const model = {content: [{id: "edit", content: []}]}
    addHostFileMenuItems(model, [{id: "x", title: "X", action: noop}])
    assert.equal(model.content[0].content.length, 0)
})

test("entries without an id are always added", () => {
    // Only an id can replace, so anonymous entries accumulate — which is why a
    // host that rebuilds its menu should give its entries ids.
    const model = modelWithFileMenu()
    addHostFileMenuItems(model, [{title: "One", action: noop}])
    addHostFileMenuItems(model, [{title: "Two", action: noop}])
    assert.equal(model.content[0].content.length, 4)
})
