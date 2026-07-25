import type {EditorUser} from "@fiduswriter/editor"
import {gettext, initSettings, interpolate, staticUrl} from "fwtoolkit"

import {showStartupDialog} from "./startup-dialog.js"

// The editor source expects these Fidus Writer runtime helpers as globals.
// They must be present before any editor module is evaluated, because some
// editor modules call them at the top level.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).gettext = gettext
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).interpolate = interpolate
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).staticUrl = staticUrl

async function loadLocaleCatalog(locale: string): Promise<Record<string, string>> {
    try {
        const response = await fetch(`../locale/${locale}/messages.json`)
        if (!response.ok) {
            return {}
        }
        return (await response.json()) as Record<string, string>
    } catch {
        return {}
    }
}

function createGettext(catalog: Record<string, string>) {
    return function gettext(msgid: string): string {
        return catalog[msgid] || msgid
    }
}

async function main() {
    console.log("Demo main starting")
    const params = new URLSearchParams(window.location.search)
    const autostart = params.get("autostart") === "1"

    const startup = autostart
        ? {locale: "en", result: {mode: "new" as const}}
        : await showStartupDialog()
    const locale = startup.locale
    const result = startup.result

    const catalog = await loadLocaleCatalog(locale)
    const gettext = createGettext(catalog)

    initSettings({
        apiUrl: url => url,
        apiUrlMap: {},
        getCsrfToken: () => "",
        gettext,
        interpolate: (fmt, args, named) => {
            if (named) {
                return fmt.replace(/%\(([^)]+)\)s?/g, (_match, key) => {
                    const value = (args as Record<string, unknown>)[key]
                    return value !== undefined ? String(value) : ""
                })
            }
            let index = 0
            return fmt.replace(/%s/g, () => {
                const value = (args as unknown[])[index++]
                return value !== undefined ? String(value) : ""
            })
        },
        staticUrl: path => `../static/${path}`
    })

    // Editor modules must be loaded after the globals above have been set,
    // because several editor modules call staticUrl/gettext/interpolate at
    // the top level.
    const [{Editor}, {ExportFidusFile}, {createDemoApp}, documentHelpers] =
        await Promise.all([
            import("@fiduswriter/editor"),
            import("@fiduswriter/editor/exporter/native/file"),
            import("./demo-app.js"),
            import("./document-helpers.js")
        ])

    const {
        applyTemplate,
        createMockCSL,
        createDefaultDocument,
        createEmptyBibDB,
        createEmptyImageDB,
        importDocument
    } = documentHelpers

    const csl = createMockCSL()
    const user: EditorUser = {
        id: 1,
        username: "demo",
        emails: [{address: "demo@example.com", primary: true}],
        name: "Demo User",
        is_authenticated: true
    }

    let docContent: Record<string, unknown>
    let docId = 1
    let docPath = "untitled"

    if (result.mode === "import") {
        const {doc} = await importDocument(result.file, user, locale)
        docContent = doc.content as Record<string, unknown>
        docId = (doc.id as number) || 1
        docPath = (doc.path as string) || docPath
    } else {
        if (result.templateFile) {
            const template = await applyTemplate(result.templateFile)
            docContent = template.content
        } else {
            docContent = createDefaultDocument()
        }
    }

    const documentData = async () => ({
        doc: {
            v: 0,
            content: docContent,
            comments: {},
            bibliography: createEmptyBibDB().db,
            images: createEmptyImageDB().db
        },
        doc_info: {
            id: docId,
            rights: "write",
            is_owner: true,
            path: docPath,
            updated: new Date(),
            dir: "ltr",
            access_rights: "write",
            e2ee: false,
            owner: {
                id: user.id,
                name: user.name,
                type: "user",
                contacts: []
            }
        },
        time: Date.now()
    })

    const app = createDemoApp({
        locale,
        gettext,
        csl,
        documentData
    })

    const editor = new Editor({app, user}, docPath, String(docId))

    function downloadDocument(): void {
        const doc = editor.getDoc({use_current_view: true})
        new ExportFidusFile(
            editor.app,
            doc,
            editor.mod.db.bibDB,
            editor.mod.db.imageDB,
            false
        )
    }

    // Wire local save/download: intercept NoCollabSave calls and offer a
    // downloadable .fidus file instead.
    const originalSaveDocument = app.apiConnectors.document.saveDocument
    app.apiConnectors.document.saveDocument = async (data, options) => {
        const response = await originalSaveDocument(data, options)
        if (!options?.keepalive) {
            downloadDocument()
        }
        return response
    }

    // Make download available for debugging/tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).downloadDocument = downloadDocument
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).startDemoEditor = main

    await editor.init()
}

main().catch(error => {
    console.error("Demo failed to start:", error)
    document.body.innerHTML = `<pre style="padding:20px;color:red">${String(
        error
    )}</pre>`
})
