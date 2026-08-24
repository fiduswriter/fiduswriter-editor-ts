import {test, expect} from "@playwright/test"

/**
 * Header document title behavior in the static editor.
 *
 * With the Fidus Writer server backend the header <h1 id="document-title">
 * is contenteditable and editing it changes the document's path via a
 * `path_change` WebSocket message. Static deployments have no such concept,
 * so `createStaticEditor` disables title editing by default (`pathEditable`
 * defaults to false). Hosts that implement path changes can opt back in
 * with `pathEditable: true` + `onPathChange`.
 *
 * The demo editor exposes the opt-in via ?title-editing=1 and logs every
 * onPathChange call to window.titleChanges.
 */
test("header document title is not editable by default", async ({page}) => {
    await page.goto("/editor/?autostart=1")
    await page.waitForFunction(() => window.demoEditor !== undefined, {
        timeout: 90000
    })

    const title = page.locator("h1#document-title")
    await expect(title).toBeVisible()
    // No contenteditable attribute — the title must be plain text.
    expect(await title.getAttribute("contenteditable")).toBeNull()

    const editable = await page.evaluate(
        () => window.demoEditor.pathEditable
    )
    expect(editable).toBe(false)
})

test("title editing opt-in renders an editable title and fires onPathChange", async ({
    page
}) => {
    await page.goto("/editor/?autostart=1&title-editing=1")
    await page.waitForFunction(() => window.demoEditor !== undefined, {
        timeout: 90000
    })

    const title = page.locator("h1#document-title")
    expect(await title.getAttribute("contenteditable")).toBe("true")

    // Edit the header title and blur. saveFileName() cleans the typed value
    // into a path ("/Renamed doc") and invokes onPathChange with it.
    await title.click()
    await page.keyboard.press("Control+a")
    await page.keyboard.type("Renamed doc")
    await page.keyboard.press("Tab")

    await page.waitForFunction(
        () => (window.titleChanges as string[] | undefined)?.length === 1,
        undefined,
        {timeout: 10000}
    )

    const changes = await page.evaluate(() => window.titleChanges)
    expect(changes).toEqual(["/Renamed doc"])
    // The header now displays the new path.
    await expect(title).toHaveText("/Renamed doc")
})
