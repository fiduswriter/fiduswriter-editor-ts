import type {Editor} from "@fiduswriter/editor"
import {createStaticEditor} from "@fiduswriter/editor/static_editor"

import {createDemoApp} from "../editor/demo-app.js"
import {
    createDefaultDocument,
    createEmptyBibDB,
    createEmptyImageDB
} from "../editor/document-helpers.js"

const STORAGE_KEY = "fiduswriter-embedded-demo"

/**
 * Reference implementation for embedding the Fidus Writer editor in a host
 * page (a CMS, plugin, or other application) — no iframe required.
 *
 * The host page:
 *   - loads fwtoolkit's *scoped* stylesheets (css-scoped/) plus the editor's
 *     own css (which targets the .fw-editor container class),
 *   - provides a container element with an inert (disabled) reset.css link so
 *     the editor does not inject the global reset,
 *   - calls createStaticEditor with `mount`.
 */
async function main(): Promise<void> {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    let docContent: Record<string, unknown>
    let storedPayload: Record<string, unknown> | null = null
    if (stored) {
        try {
            storedPayload = JSON.parse(stored) as Record<string, unknown>
            docContent = storedPayload.content as Record<string, unknown>
        } catch {
            docContent = createDefaultDocument()
        }
    } else {
        docContent = createDefaultDocument()
    }

    let version = (storedPayload?.version as number) || 0

    const documentData = async () => ({
        doc: {
            v: version,
            content: docContent,
            comments: (storedPayload?.comments as Record<string, unknown>) || {},
            bibliography: (storedPayload?.bibliography as Record<string, unknown>) ||
                createEmptyBibDB().db,
            images: (storedPayload?.images as Record<string, unknown>) ||
                createEmptyImageDB().db
        },
        doc_info: {
            id: 1,
            rights: "write",
            is_owner: true,
            path: "",
            updated: new Date(),
            dir: "ltr",
            access_rights: "write",
            e2ee: false,
            owner: {
                id: 1,
                name: "Demo User",
                type: "user",
                contacts: []
            }
        },
        time: Date.now()
    })

    const editor: Editor = await createStaticEditor({
        locale: "en",
        username: "Demo User",
        userId: 1,
        userPreferences: {},
        documentData,
        staticBasePath: "../",
        documentStyles: createDemoApp.documentStyles,
        exportTemplates: createDemoApp.exportTemplates,
        documentTemplates: createDemoApp.documentTemplates,
        mount: "#fw-editor",
        saveMode: "direct",
        onSaveDocument: async data => {
            version = Number(data.version || 0) + 1
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    version,
                    content: data.content,
                    comments: data.comments,
                    bibliography: data.bibliography,
                    images: data.images
                })
            )
            return {json: {version}, status: 200}
        }
    })

    // Make the editor instance available for debugging/tests.
    ;(window as unknown as Record<string, unknown>).demoEditor = editor
}

main().catch(error => {
    console.error("Embedded demo failed to start:", error)
    const container = document.querySelector("#fw-editor")
    if (container) {
        container.innerHTML = `<pre style="padding:20px;color:#b32d2e">${String(
            error
        )}</pre>`
    }
})
