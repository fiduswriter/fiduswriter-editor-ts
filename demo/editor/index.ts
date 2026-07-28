import type {EditorUser} from "@fiduswriter/editor"
import {gettext, initSettings, interpolate, staticUrl} from "fwtoolkit"

import {showStartupDialog} from "./startup-dialog.js"

// The editor source expects these Fidus Writer runtime helpers as globals.
// They must be present before any editor module is evaluated, because some
// editor modules call them at the top level.
;(window as any).gettext = gettext
;(window as any).interpolate = interpolate
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
        ? {locale: "en", username: "Demo User", result: {mode: "new" as const}}
        : await showStartupDialog()
    const locale = startup.locale
    const username = startup.username
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
        staticUrl: path => {
            // Compute the demo's base path so that assets resolve to absolute
            // URLs. This is required for stylesheets loaded by Vivliostyle
            // during printing, because the print document is a blob and
            // relative URLs inside it resolve against the blob origin.
            const basePath = window.location.pathname.replace(
                /\/(?:editor\/(?:index\.html)?|index\.html)$/,
                "/"
            )
            // CSS files are deployed under css/; other static assets under static/.
            // The editor source requests some CSS paths with virtual prefixes that
            // the Django static-file collector provides; remap them for the demo.
            if (path.startsWith("css/editor/")) {
                return `${basePath}css/${path.slice("css/editor/".length)}`
            }
            if (path === "css/bibliography/bibliography.css") {
                return `${basePath}css/bibliography.css`
            }
            if (path.startsWith("css/")) {
                return `${basePath}${path}`
            }
            return `${basePath}static/${path}`
        }
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

    const [{createCSL}, {ConfirmedDocEditorPlugin}] = await Promise.all([
        import("@fiduswriter/document/citations/create_csl"),
        import("./plugins/confirmed_doc")
    ])

    const {
        applyTemplate,
        createDefaultDocument,
        createEmptyBibDB,
        createEmptyImageDB,
        importDocument
    } = documentHelpers

    // Use citeproc-plus's bundled style and locale data so any citation style
    // referenced by an imported document can be resolved at runtime.
    const csl = await createCSL()
    // createCSL replaces getStyle/getLocale with versions that only look at
    // pre-registered styles. Restore the prototype methods so the bundled
    // style/locale chunks are loaded dynamically.
    const cslProto = Object.getPrototypeOf(csl)
    ;(csl as any).getStyle = cslProto.getStyle
    ;(csl as any).getLocale = cslProto.getLocale
    const user: EditorUser = {
        id: 1,
        username: username.toLowerCase().replace(/\s+/g, "_") || "demo",
        emails: [{address: "demo@example.com", primary: true}],
        name: username,
        is_authenticated: true
    }

    let docContent: Record<string, unknown>
    let docId = 1
    let docPath = ""
    let importedBibDB: Record<string, Record<string, unknown>> | undefined
    let importedImageDB: Record<string, Record<string, unknown>> | undefined

    if (result.mode === "import") {
        const {doc, bibliography, images} = await importDocument(
            result.file,
            user,
            locale
        )
        docContent = doc.content as Record<string, unknown>
        docId = (doc.id as number) || 1
        docPath = (doc.path as string) || docPath
        importedBibDB = bibliography
        importedImageDB = images
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
            bibliography: importedBibDB ?? createEmptyBibDB().db,
            images: importedImageDB ?? createEmptyImageDB().db
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

    const initialImages = importedImageDB
        ? (Object.fromEntries(
              Object.entries(importedImageDB).map(([id, entry]) => [
                  Number(id),
                  entry as any
              ])
          ) as Record<number, any>)
        : undefined

    const app = createDemoApp({
        locale,
        gettext,
        csl,
        documentData,
        getDocContent: () => docContent,
        initialImages
    })

    // Prime the user bibliography and image databases so dialogs that read
    // from them see empty but valid stores.
    await Promise.all([
        (app.bibDB as any).getDB(),
        (app.imageDB as any).getDB()
    ])

    const editor = new Editor(
        {app, user},
        docPath,
        String(docId),
        [["demo", {ConfirmedDocEditorPlugin}]]
    )

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

    // The editor runs in EDITOR_SAVE_MODE="external", so it never auto-saves.
    // Downloads are triggered only by the File > Download menu or this helper.

    // Make download available for debugging/tests.
    ;(window as any).downloadDocument = downloadDocument
    ;(window as any).startDemoEditor = main

    await editor.init()
}

main().catch(error => {
    console.error("Demo failed to start:", error)
    document.body.innerHTML = `<pre style="padding:20px;color:red">${String(
        error
    )}</pre>`
})
