import {test, expect} from "@playwright/test"

/**
 * HTML export of a document with formulas must not fetch the MathLive style
 * bundle when equations are rendered as SVG.
 *
 * Regression: the exporter added `mathlive_style.zip` (and the mathlive.css
 * stylesheet) whenever the document contained math, even with
 * `mathOutput: "svg"`. In the demo that URL is not deployed, so every HTML
 * export of a document with formulas produced a 404. SVG equations are
 * self-contained data-URI `<img>`s and carry no MathLive styles, so the bundle
 * should only be included for MathML output.
 *
 * Requires the fixed `@fiduswriter/document` (the version that gates the
 * MathLive assets on `mathOutput` in `src/exporter/html/convert.ts` and
 * `src/exporter/html/index.ts`); it fails on the buggy one.
 */
test.describe("HTML export math output", () => {
    async function startEditor(page: import("@playwright/test").Page) {
        await page.goto("/editor/")
        // Load the sample document, which contains inline + display equations.
        await page.click("#demo-load-sample")
        await page.waitForFunction(() => window.demoEditor !== undefined, {
            timeout: 90000
        })
        await page.waitForTimeout(3000)
    }

    async function exportHtml(
        page: import("@playwright/test").Page,
        svgMode: boolean
    ) {
        // Open the Export menu and click the HTML export action.
        await page.click("#header-navigation .header-nav-item:has-text('Export')")
        await page.waitForSelector(".fw-pulldown-item")
        await page.click('.fw-pulldown-item:has-text("HTML")')

        // In the options dialog, set/clear the "SVG instead of MathML" checkbox.
        await page.waitForSelector(".html-svg-math", {timeout: 15000})
        if (svgMode) {
            await page.check(".html-svg-math")
        } else {
            await page.uncheck(".html-svg-math")
        }
        await page.click('.fw-dialog-buttonset button:has-text("Export")')

        // Give the pipeline time to run (zip creation + possible zip fetch).
        await page.waitForTimeout(10000)
    }

    test("SVG mode does not fetch mathlive_style.zip", async ({page}) => {
        const zipRequests: string[] = []
        page.on("request", req => {
            if (req.url().includes("mathlive_style.zip")) {
                zipRequests.push(req.url())
            }
        })

        await startEditor(page)
        await exportHtml(page, true)

        expect(zipRequests, "no mathlive_style.zip fetch in SVG mode").toEqual(
            []
        )
    })

    test("MathML mode fetches mathlive_style.zip successfully", async ({
        page
    }) => {
        const zipResponses: number[] = []
        page.on("response", resp => {
            if (resp.url().includes("mathlive_style.zip")) {
                zipResponses.push(resp.status())
            }
        })

        await startEditor(page)
        await exportHtml(page, false)

        expect(zipResponses.length).toBeGreaterThan(0)
        expect(
            zipResponses.every(status => status === 200),
            "mathlive_style.zip is served"
        ).toBe(true)
    })
})
