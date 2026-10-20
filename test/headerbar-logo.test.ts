// Regression test for the double fox: the header carries branding twice — the
// editor's own fox-face CSS background on #document-top > h1 and a
// host-supplied <img id="document-logo"> — and the two are drawn at the same
// left offset at different heights, so a host that sets `logoUrl` used to show
// *two* foxes stacked in the corner of the header. The view marks the title
// with `.host-logo` exactly when it emits the logo element, and editor.css
// suppresses the fox-face background for that class; this test pins both
// halves so they cannot drift apart.
import {describe, test, expect} from "@jest/globals"
import {readFileSync} from "fs"
import {fileURLToPath} from "url"
import {dirname, join} from "path"

import {HeaderbarView} from "../dist/menus/headerbar/view.js"

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..")

/** The context pieces `getHeaderHTML` reads; nothing else is touched. */
function contextWithLogo(logoUrl: string | undefined) {
    return {
        editor: {
            menu: {
                headerbarModel: {
                    open: true,
                    content: [
                        {
                            id: "file",
                            title: "File",
                            type: "menu",
                            open: false,
                            content: []
                        }
                    ]
                }
            },
            app: {
                settings: {
                    LOGO_URL: logoUrl,
                    EDITOR_ONLY_MODE: true
                },
                isOffline: () => true
            },
            docInfo: {path: "/", token: undefined},
            pathEditable: false,
            mod: {collab: {participants: [{id: 1}]}}
        },
        getPathText: () => "My Document",
        getHeaderNavHTML: HeaderbarView.prototype.getHeaderNavHTML,
        getParticipantListHTML: HeaderbarView.prototype.getParticipantListHTML,
        getAccessKeyHTML: HeaderbarView.prototype.getAccessKeyHTML
    }
}

function headerHTML(logoUrl: string | undefined): string {
    return HeaderbarView.prototype.getHeaderHTML.call(contextWithLogo(logoUrl))
}

describe("header branding", () => {
    test("a host logo emits the logo element and marks the title", () => {
        const html = headerHTML("/fiduswriter-logo.png")
        expect(html).toContain('<img id="document-logo"')
        expect(html).toContain('<h1 id="document-title" class="host-logo"')
    })

    test("without a host logo there is no logo element and no mark", () => {
        const html = headerHTML("")
        expect(html).not.toContain('id="document-logo"')
        expect(html).not.toContain("host-logo")
    })

    test("the CSS suppresses the fox face exactly for the emitted class", () => {
        const css = readFileSync(join(pkgDir, "css", "editor.css"), "utf-8")
        // The rule must key off the class the view emits ...
        const rule = css.match(
            /#document-top\s*>\s*h1\.host-logo\s*\{([^}]*)\}/
        )
        expect(rule).not.toBeNull()
        // ... and must actually drop the background.
        expect(rule![1]).toMatch(/background:\s*initial/)
    })
})
