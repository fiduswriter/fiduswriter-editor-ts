import type {CSL, EditorBibDB, EditorImageDB} from "@fiduswriter/editor"
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
    const bibDB: EditorBibDB = {db: {}}
    const imageDB: EditorImageDB = {
        db: {},
        saveImage: async () => 1,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setImage: (_id, _data) => {}
    }

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

    const contactsApi: EditorContactsApi = {
        add: async () => ({json: {}, status: 200})
    }

    return {
        name: "fiduswriter-editor-demo",
        routes: {
            document: {app: "document"}
        },
        goTo: () => {},
        isOffline: () => false,
        settings: {
            APPS: [],
            EDITOR_SAVE_MODE: "external",
            E2EE_MODE: "disabled",
            LANGUAGE: config.locale
        },
        csl: config.csl,
        bibDB,
        imageDB,
        apiConnectors: {
            document: documentApi,
            documentImport: documentImportApi,
            image: imageApi,
            contacts: contactsApi
        }
    }
}
