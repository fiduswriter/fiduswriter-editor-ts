import type {CSL, EditorImageDB} from "@fiduswriter/editor"
import {BibliographyDB} from "@fiduswriter/bibliography-manager/database"
import type {BibliographyApi} from "@fiduswriter/bibliography-manager"
import {ImageDB} from "@fiduswriter/image-manager/database"
import type {ImageApi} from "@fiduswriter/image-manager"
import type {EditorApp, EditorContactsApi, EditorDocumentApi, EditorDocumentImportApi} from "@fiduswriter/editor"

export interface DemoAppConfig {
    locale: string
    gettext: (msgid: string) => string
    csl: CSL
    documentData: () => Promise<{
        doc: Record<string, unknown>
        doc_info: Record<string, unknown>
        time: number
    }>
}

export function createDemoApp(config: DemoAppConfig): EditorApp {
    const documentApi: EditorDocumentApi = {
        createDocument: async () => ({json: {id: 1}, status: 200}),
        getWebSocketBase: async () => ({json: {ws_base: ""}, status: 200}),
        getDocumentStyles: async () => ({
            json: {
                export_templates: [],
                document_styles: [],
                document_templates: {}
            },
            status: 200
        }),
        getDocumentData: async () => {
            const data = await config.documentData()
            return {json: data, status: 200}
        },
        saveDocument: async data => {
            console.log("Save document:", data)
            return {json: {version: 0}, status: 200}
        },
        commentNotify: async () => Promise.resolve(),
        requestAccess: async () => ({json: {}, status: 200}),
        validateShareToken: async () => ({json: {}, status: 404}),
        listShareTokens: async () => ({json: [], status: 200}),
        createShareToken: async () => ({json: {}, status: 200}),
        revokeShareToken: async () => ({json: {}, status: 200}),
        getAccessRights: async () => ({json: {}, status: 200}),
        saveAccessRights: async () => Promise.resolve(),
        saveE2EEImage: async () => ({json: {}, status: 200}),
        deleteE2EEImage: async () => Promise.resolve(),
        uploadRevision: async () => Promise.resolve(),
        getTemplateForDoc: async () => ({json: {}, status: 200})
    }

    const documentImportApi: EditorDocumentImportApi = {
        createDoc: async () => ({json: {id: 1}, status: 200}),
        saveImage: async () => ({json: {}, status: 200}),
        saveE2EEImage: async () => ({json: {}, status: 200}),
        saveDocument: async data => {
            console.log("Import save document:", data)
            return {json: {version: 0}, status: 200}
        }
    }

    const imageApi: ImageApi = {
        getImages: async () => ({imageCategories: [], images: []}),
        saveImage: async () => ({
            errormsg: {},
            values: {
                id: 1,
                title: "",
                file_type: "png",
                image: "",
                width: 0,
                height: 0,
                added: Date.now(),
                cats: [],
                copyright: {freeToRead: true, licenses: []}
            }
        }),
        saveCategories: async () => ({entries: []}),
        deleteImages: async () => Promise.resolve()
    }

    const bibliographyApi: BibliographyApi = {
        getDB: async () => ({
            bib_categories: [],
            bib_list: [],
            last_modified: -1,
            number_of_entries: 0,
            user_id: 1
        }),
        saveBibEntries: async tmpDB => ({
            id_translations: Object.keys(tmpDB).map(tmpId => [
                Number.parseInt(tmpId),
                Number.parseInt(tmpId)
            ])
        }),
        saveCategories: async () => ({entries: []}),
        deleteCategory: async () =>
            new Response(JSON.stringify({}), {status: 200}),
        deleteBibEntries: async () =>
            new Response(JSON.stringify({}), {status: 200})
    }

    const contactsApi: EditorContactsApi = {
        add: async () => ({json: {}, status: 200})
    }

    // Build a partial app object first; the real bibliography/image DB classes
    // need the app reference (including the API connectors) in their
    // constructors.
    const app = {
        name: "fiduswriter-editor-demo",
        routes: {
            "": {app: "document"},
            document: {app: "document"}
        },
        goTo: () => {},
        isOffline: () => false,
        settings: {
            APPS: ["demo"],
            EDITOR_SAVE_MODE: "external",
            EDITOR_ONLY_MODE: true,
            E2EE_MODE: "disabled",
            LANGUAGE: config.locale
        },
        csl: config.csl,
        apiConnectors: {
            document: documentApi,
            documentImport: documentImportApi,
            image: imageApi,
            bibliography: bibliographyApi,
            contacts: contactsApi
        }
    } as unknown as EditorApp

    const bibDB = new BibliographyDB(app as any)
    const imageDB = new ImageDB(app as any) as unknown as EditorImageDB
    // The editor's type expects `setImage` on the user image DB, but the
    // image-manager class only stores images that have been uploaded. Add the
    // noop expected by the editor interface.
    imageDB.setImage = (_id, _data) => {}

    ;(app as any).bibDB = bibDB
    ;(app as any).imageDB = imageDB

    return app
}
