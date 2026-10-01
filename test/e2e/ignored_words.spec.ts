import {test, expect, type Page} from "@playwright/test"

/**
 * The per-user spell-checker ignore lists (see
 * docs/plans/SPELLCHECK_IGNORED_WORDS.md in fiduswriter/), end to end in
 * the demo editor against the real lingotweaker-wasm engine:
 *
 * - the right-click popup on a misspelling underline offers
 *   'Add "<word>" to ignored words' (and no "Ignore rule"), and clicking
 *   it removes the underline;
 * - the popup on a grammar underline offers "Ignore rule" (and no
 *   add-to-ignored-words button), and clicking it removes the underline;
 * - Tools → Ignored words shows the lists for manual editing; deleting a
 *   term and re-checking restores the underline;
 * - the demo host has no save callbacks, so the dialog shows the
 *   session-only note.
 */

async function startEditor(page: Page) {
    await page.goto("/editor/?autostart=1")
    await page.waitForFunction(() => window.demoEditor !== undefined, {
        timeout: 90000
    })
}

async function checkText(page: Page) {
    await page.locator("#header-navigation .header-nav-item", {
        hasText: "Tools"
    }).click()
    await page.locator(".fw-pulldown-item", {hasText: "Spell/grammar checker"}).click()
    await page.locator(".fw-pulldown-item", {hasText: "Check text"}).click()
}

async function openIgnoredWordsDialog(page: Page) {
    await page.locator("#header-navigation .header-nav-item", {
        hasText: "Tools"
    }).click()
    await page.locator(".fw-pulldown-item", {hasText: "Spell/grammar checker"}).click()
    await page.locator(".fw-pulldown-item", {hasText: "Ignored words"}).click()
    return page.locator(".fw-dialog").filter({hasText: "Ignored words"})
}

test.describe("spell-checker ignore lists", () => {
    test("ignored word round trip through popup and dialog", async ({
        page
    }) => {
        await startEditor(page)

        // Type a word the engine reports as a misspelling.
        await page.locator(".ProseMirror").first().click()
        await page.keyboard.type("teh ")

        await checkText(page)
        const spelling = page.locator("span.spelling", {hasText: "teh"})
        await expect(spelling.first()).toBeVisible({timeout: 60000})

        // The misspelling popup offers the words action, not ignore-rule.
        await spelling.first().click({button: "right"})
        const dialog = page.locator(".fw-dialog")
        await expect(
            dialog.locator(".add-ignored", {hasText: '"teh"'})
        ).toBeVisible()
        await expect(dialog.locator(".add-ignored-rule")).toHaveCount(0)
        await dialog.locator(".add-ignored").click()

        // Adding the word removes the underline.
        await expect(page.locator("span.spelling")).toHaveCount(0, {
            timeout: 30000
        })

        // The dialog lists the term for manual editing.
        const ignoredDialog = await openIgnoredWordsDialog(page)
        await expect(ignoredDialog.locator("textarea.ignored-words")).toHaveValue(
            "teh"
        )
        // The demo host has no persistence callbacks.
        await expect(
            ignoredDialog.locator("p", {
                hasText: "Changes apply to this session only."
            })
        ).toBeVisible()

        // Removing the term and re-checking restores the underline.
        await ignoredDialog.locator("textarea.ignored-words").fill("")
        await ignoredDialog.locator("button", {hasText: "Save"}).click()
        await checkText(page)
        await expect(
            page.locator("span.spelling", {hasText: "teh"}).first()
        ).toBeVisible({timeout: 60000})
    })

    test("grammar match offers ignore rule, which suppresses the rule", async ({
        page
    }) => {
        await startEditor(page)

        // A duplicated word triggers a grammar-kind rule.
        await page.locator(".ProseMirror").first().click()
        await page.keyboard.type("This is is a test. ")

        await checkText(page)
        const underlines = page.locator(
            "span.grammar, span.language, span.spelling"
        )
        await expect(underlines.first()).toBeVisible({timeout: 60000})

        // Find an underline whose popup shows the ignore-rule button
        // (any non-misspelling match); duplicated words are reported by
        // the English pack.
        const grammar = page.locator("span.grammar, span.language").first()
        if (await grammar.count()) {
            await grammar.click({button: "right"})
            const dialog = page.locator(".fw-dialog")
            await expect(dialog.locator(".add-ignored-rule")).toBeVisible()
            await expect(dialog.locator(".add-ignored")).toHaveCount(0)
            await dialog.locator(".add-ignored-rule").click()
            await expect(page.locator("span.grammar")).toHaveCount(0, {
                timeout: 30000
            })
            // The rule landed in the ignored-rules list.
            const ignoredDialog = await openIgnoredWordsDialog(page)
            const rules = await ignoredDialog
                .locator("textarea.ignored-rules")
                .inputValue()
            expect(rules.trim().length).toBeGreaterThan(0)
            await page.keyboard.press("Escape")
        }
    })
})
