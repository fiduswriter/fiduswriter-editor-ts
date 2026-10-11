// Tests for addHostMenuItems, which splices host-provided entries into the
// editor's menus. Run as a plain node script, like
// no-collab-save-scheduling.js, because the helper is pure and lives in its own
// module, free of the editor's DOM dependencies.
//
// A host without a Fidus Writer backend owns the document lifecycle — which file
// is open, where it is saved, what "New" means — so the editor cannot supply
// Open, Save as or New itself. This is how those end up in the editor's own
// File menu instead of a separate toolbar bolted onto the page — and how any
// host adds entries to any other menu, or a top-level menu of its own.
import assert from "node:assert"

import {addHostMenuItems} from "../dist/menus/headerbar/host_items.js"

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

/** A minimal built model with a File and a Settings menu, like the headerbar. */
function modelWithMenus() {
    return {
        content: [
            {
                id: "file",
                title: "File",
                content: [{id: "share", type: "action", title: "share"}]
            },
            {
                id: "settings",
                title: "Settings",
                content: [{id: "citation_style", type: "menu", title: "style"}]
            }
        ]
    }
}

const noop = () => {}

/** A contribution targeting the editor's File menu. */
const fileMenu = items => [{menuId: "file", items}]

test("host entries are prepended so they sit at the top of the File menu", () => {
    const model = modelWithMenus()
    addHostMenuItems(
        model,
        fileMenu([{id: "fw_open", title: "Open…", action: noop}])
    )
    const file = model.content[0]
    assert.equal(file.content[0].id, "fw_open")
    // The built-in entries are still there, after ours.
    assert.deepEqual(
        file.content.slice(1).map(i => i.id),
        ["share"]
    )
})

test("entries default to type 'action' so the view treats them as actions", () => {
    const model = modelWithMenus()
    addHostMenuItems(model, fileMenu([{id: "x", title: "X", action: noop}]))
    assert.equal(model.content[0].content[0].type, "action")
})

test("other menus are untouched", () => {
    const model = modelWithMenus()
    addHostMenuItems(model, fileMenu([{id: "x", title: "X", action: noop}]))
    assert.deepEqual(
        model.content[1].content.map(i => i.id),
        ["citation_style"]
    )
})

test("a matching id replaces the entry rather than duplicating it", () => {
    // A host that rebuilds its menu must not accumulate copies.
    const model = modelWithMenus()
    addHostMenuItems(model, [
        {
            menuId: "file",
            items: [{id: "share", title: "Share (local)", action: noop}]
        }
    ])
    const file = model.content[0]
    assert.equal(file.content.filter(i => i.id === "share").length, 1)
    assert.deepEqual(
        file.content.map(i => i.id),
        ["share"]
    )
})

test("title and action are passed through unchanged", () => {
    const model = modelWithMenus()
    let ran = 0
    addHostMenuItems(
        model,
        fileMenu([
            {
                id: "x",
                title: editor => `Open ${editor.docInfo.title}`,
                action: () => {
                    ran++
                }
            }
        ])
    )
    const item = model.content[0].content[0]
    assert.equal(typeof item.title, "function")
    assert.equal(item.title({docInfo: {title: "Doc"}}), "Open Doc")
    item.action({})
    assert.equal(ran, 1)
})

test("available/disabled/icon are carried through", () => {
    const model = modelWithMenus()
    addHostMenuItems(
        model,
        fileMenu([
            {
                id: "x",
                title: "X",
                action: noop,
                icon: "fa-folder-open",
                available: () => true,
                disabled: () => false
            }
        ])
    )
    const item = model.content[0].content[0]
    assert.equal(item.icon, "fa-folder-open")
    assert.equal(item.available(), true)
    assert.equal(item.disabled(), false)
})

test("an empty or missing list leaves the model exactly as it was", () => {
    for (const items of [undefined, []]) {
        const model = modelWithMenus()
        const before = JSON.stringify(model)
        addHostMenuItems(model, fileMenu(items))
        assert.equal(JSON.stringify(model), before)
    }
})

test("a model with no matching menu gets a new menu only with a title", () => {
    const model = modelWithMenus()
    addHostMenuItems(model, [
        {menuId: "missing", items: [{id: "x", title: "X", action: noop}]}
    ])
    assert.equal(model.content.length, 2)
})

test("entries without an id are always added", () => {
    // Only an id can replace, so anonymous entries accumulate — which is why a
    // host that rebuilds its menu should give its entries ids.
    const model = modelWithMenus()
    addHostMenuItems(model, fileMenu([{title: "One", action: noop}]))
    addHostMenuItems(model, fileMenu([{title: "Two", action: noop}]))
    assert.equal(model.content[0].content.length, 3)
})

test("entries can be added to a menu other than File", () => {
    const model = modelWithMenus()
    addHostMenuItems(model, [
        {
            menuId: "settings",
            position: "end",
            items: [{id: "prefs", title: "User preferences", action: noop}]
        }
    ])
    const settings = model.content.find(menu => menu.id === "settings")
    assert.equal(settings.content.length, 2)
    assert.equal(settings.content[1].id, "prefs")
    assert.equal(settings.content[1].type, "action")
    // File is untouched.
    assert.equal(model.content[0].content.length, 1)
})

test("position 'end' appends, 'start' (default) prepends", () => {
    const startModel = modelWithMenus()
    addHostMenuItems(startModel, [
        {menuId: "settings", items: [{id: "x", title: "X", action: noop}]}
    ])
    assert.equal(startModel.content[1].content[0].id, "x")

    const endModel = modelWithMenus()
    addHostMenuItems(endModel, [
        {
            menuId: "settings",
            position: "end",
            items: [{id: "x", title: "X", action: noop}]
        }
    ])
    assert.equal(endModel.content[1].content[1].id, "x")
})

test("a host can create an entirely new top-level menu", () => {
    const model = modelWithMenus()
    addHostMenuItems(model, [
        {
            menuId: "app",
            menuTitle: "My App",
            keys: "Alt-a",
            items: [{id: "thing", title: "Do the thing", action: noop}]
        }
    ])
    assert.equal(model.content.length, 3)
    const created = model.content[2]
    assert.equal(created.id, "app")
    assert.equal(created.title, "My App")
    assert.equal(created.type, "menu")
    assert.equal(created.keys, "Alt-a")
    assert.equal(created.content[0].id, "thing")
    // New menus go to the far right.
    assert.equal(model.content[1].id, "settings")
})

test("contributing to an existing menu never duplicates the menu", () => {
    const model = modelWithMenus()
    addHostMenuItems(model, [
        {
            menuId: "settings",
            menuTitle: "Settings",
            items: [{id: "x", title: "X", action: noop}]
        }
    ])
    assert.equal(model.content.length, 2)
})

test("a contribution without a title cannot create a menu", () => {
    // Entries without a menu to live in would be unreachable.
    const model = modelWithMenus()
    addHostMenuItems(model, [
        {menuId: "missing", items: [{id: "x", title: "X", action: noop}]}
    ])
    assert.equal(model.content.length, 2)
})

test("id replacement works in other menus and from later calls", () => {
    const model = modelWithMenus()
    addHostMenuItems(model, [
        {
            menuId: "settings",
            position: "end",
            items: [{id: "prefs", title: "User preferences", action: noop}]
        }
    ])
    // A host rebuilding its list must not accumulate copies.
    addHostMenuItems(model, [
        {
            menuId: "settings",
            position: "end",
            items: [{id: "prefs", title: "User preferences", action: noop}]
        }
    ])
    const settings = model.content.find(menu => menu.id === "settings")
    assert.equal(settings.content.length, 2)
})
