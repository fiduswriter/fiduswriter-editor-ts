import {test, expect} from "@playwright/test"

/**
 * Browser regression test for the print pipeline on a document with formulas.
 *
 * Print (menu "Print"/Ctrl+P) runs the whole client-side print stack:
 *   HTML export with MathJax TeX→SVG (mathOutput: "svg")
 *   → @vivliostyle/print pagination in a hidden iframe → window.print().
 *
 * It used to fail before reaching vivliostyle with
 * "TypeError: h is not a function" — a CJS→ESM interop bug: esbuild code-splits
 * the dynamically imported CommonJS `mathjax-full` modules into chunks that
 * only expose a `default` export, so destructured named imports
 * (`browserAdaptor`, `liteAdaptor`, …) were `undefined`. The exporter now reads
 * those imports through `.default ?? mod`.
 *
 * We detect success by `window.printInstance`, which @vivliostyle/print's
 * `VivliostylePrint.init()` sets on the top window right after the HTML has been
 * generated (i.e. after the MathJax conversion succeeded) and only clears after
 * the print callback ran. Note: pagination itself may never finish when a piece
 * of content cannot fit on any page (a separate vivliostyle issue), so we assert
 * that the pipeline reached the pagination stage rather than that it completed.
 *
 * This test requires the fixed `@fiduswriter/document` (the version that ships
 * the interop fix in `src/exporter/html/math.ts`); it fails on the buggy one.
 */
test("Print reaches the vivliostyle pagination stage on a document with formulas", async ({
    page
}) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    page.on("pageerror", err => {
        pageErrors.push(String(err))
    })
    page.on("console", msg => {
        if (msg.type() === "error") {
            consoleErrors.push(msg.text())
        }
    })

    await page.goto("/editor/")
    // The startup dialog is shown; load the sample document, which contains
    // inline and display equations.
    await page.click("#demo-load-sample")

    await page.waitForFunction(() => window.demoEditor !== undefined, {
        timeout: 90000
    })
    // Let the editor finish initialising before triggering the print shortcut.
    await page.waitForTimeout(3000)

    // Menu shortcut for the Print action.
    await page.keyboard.press("Control+p")

    // Wait for the pipeline to generate the HTML and hand it to vivliostyle
    // (window.printInstance is set). On the CJS interop regression the flow
    // throws during the MathJax conversion and this never happens.
    await page.waitForFunction(
        () => window.printInstance !== undefined,
        undefined,
        {timeout: 60000}
    )

    expect(
        pageErrors,
        "no uncaught page errors during print (mathjax-full CJS interop regression)"
    ).toEqual([])
    expect(
        consoleErrors.some(e => e.includes("is not a function")),
        "no 'X is not a function' console error"
    ).toBe(false)
})
