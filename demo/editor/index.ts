import type {Editor} from "@fiduswriter/editor"
import {createStaticEditor} from "@fiduswriter/editor/static_editor"
import {ExportFidusFile} from "@fiduswriter/editor/exporter/native/file"

import {createDemoApp} from "./demo-app.js"
import {showStartupDialog} from "./startup-dialog.js"

async function main(): Promise<void> {
    console.log("Demo main starting")
    const params = new URLSearchParams(window.location.search)
    const autostart = params.get("autostart") === "1"

    const startup = autostart
        ? {locale: "en", username: "Demo User", result: {mode: "new" as const}}
        : await showStartupDialog()
    const locale = startup.locale
    const username = startup.username
    const result = startup.result

    const documentHelpers = await import("./document-helpers.js")
    const {ConfirmedDocEditorPlugin} = await import("./plugins/confirmed_doc")

    const {
        applyTemplate,
        createDefaultDocument,
        createEmptyBibDB,
        createEmptyImageDB,
        importDocument
    } = documentHelpers

    let docContent: Record<string, unknown>
    let docId = 1
    let docPath = ""
    let importedBibDB: Record<string, Record<string, unknown>> | undefined
    let importedImageDB: Record<string, Record<string, unknown>> | undefined
    let importedComments: Record<string | number, Record<string, unknown>> | undefined

    if (result.mode === "import") {
        const user = {
            id: 1,
            username: username.toLowerCase().replace(/\s+/g, "_") || "demo",
            emails: [{address: "demo@example.com", primary: true}],
            name: username,
            is_authenticated: true
        }
        const {doc, bibliography, images, comments} = await importDocument(
            result.file,
            user,
            locale
        )
        docContent = doc.content as Record<string, unknown>
        docId = (doc.id as number) || 1
        docPath = (doc.path as string) || docPath
        importedBibDB = bibliography
        importedImageDB = images
        importedComments = comments
    } else if (result.templateFile) {
        const template = await applyTemplate(result.templateFile)
        docContent = template.content
    } else {
        docContent = createDefaultDocument()
    }

    const documentData = async () => ({
        doc: {
            v: 0,
            content: docContent,
            comments: importedComments ?? {},
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
                id: 1,
                name: username,
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
                  entry
              ])
          ) as Record<number, any>)
        : undefined

    const editor: Editor = await createStaticEditor({
        locale,
        username,
        documentData,
        initialImages,
        getDocContent: () => docContent,
        documentStyles: createDemoApp.documentStyles,
        exportTemplates: createDemoApp.exportTemplates,
        documentTemplates: createDemoApp.documentTemplates,
        plugins: [["demo", {ConfirmedDocEditorPlugin}]]
    })

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

    // Make download and the editor instance available for debugging/tests.
    ;(window as unknown as Record<string, unknown>).downloadDocument =
        downloadDocument
    ;(window as unknown as Record<string, unknown>).startDemoEditor = main
    ;(window as unknown as Record<string, unknown>).demoEditor = editor
}

main().catch(error => {
    console.error("Demo failed to start:", error)
    document.body.innerHTML = `<pre style="padding:20px;color:red">${String(
        error
    )}</pre>`
})
