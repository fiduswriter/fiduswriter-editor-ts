import type {CSL, EditorImageDB} from "@fiduswriter/editor"
import {BibliographyDB} from "@fiduswriter/bibliography-manager/database"
import type {BibliographyApi} from "@fiduswriter/bibliography-manager"
import {ImageDB} from "@fiduswriter/image-manager/database"
import type {ImageApi} from "@fiduswriter/image-manager"
import type {EditorApp, EditorContactsApi, EditorDocumentApi, EditorDocumentImportApi} from "@fiduswriter/editor"
import type {Image, SaveImageResponse} from "@fiduswriter/image-manager/types"

import templateData from "./document-template-data.json" assert {type: "json"}

function getDemoBasePath(): string {
    return window.location.pathname.replace(
        /\/(?:editor\/(?:index\.html)?|index\.html)$/,
        "/"
    )
}

function getAssetUrl(path: string): string {
    return `${getDemoBasePath()}static/${path}`
}

const documentStyles = templateData.documentStyles.map(style => ({
    title: style.title,
    slug: style.slug,
    contents: style.contents,
    documentstylefile_set: style.files.map(filename => [
        getAssetUrl(`style-files/${filename}`),
        filename
    ])
}))

const exportTemplates = templateData.exportTemplates.map(template => ({
    title: template.title,
    file_type: template.file_type,
    template_file: getAssetUrl(`export-templates/${template.file}`)
}))

const documentTemplates: Record<string, {title: string}> = {
    [templateData.documentTemplate.importId]: {
        title: templateData.documentTemplate.title
    }
}

// In-memory store for images uploaded during this demo session. This lets the
// static demo render images and export them without a server.
const demoImages: Record<number, Image> = {}
let nextImageId = 1

function fileToDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

function getImageDimensions(dataUrl: string): Promise<{width: number; height: number}> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({width: img.width, height: img.height})
        img.onerror = reject
        img.src = dataUrl
    })
}

async function storeDemoImage(
    data: Record<string, unknown>,
    files: Record<string, unknown>
): Promise<Image> {
    const id = data.id ? Number(data.id) : nextImageId++
    const existing = demoImages[id]
    const file =
        (files?.image as {file?: Blob})?.file ??
        (files?.image as Blob) ??
        (data.image as Blob)

    let imageUrl = existing?.image ?? ""
    let fileType = existing?.file_type ?? "png"
    let width = existing?.width ?? 0
    let height = existing?.height ?? 0

    if (file) {
        imageUrl = await fileToDataUrl(file)
        fileType = (data.original_file_type as string) ||
            (file as File).type ||
            "image/png"
        const dimensions = await getImageDimensions(imageUrl)
        width = dimensions.width
        height = dimensions.height
    }

    const image: Image = {
        id,
        title: (data.title as string) || existing?.title || "",
        file_type: fileType,
        image: imageUrl,
        width,
        height,
        added: existing?.added || Date.now(),
        cats: (data.cats as number[]) || existing?.cats || [],
        copyright:
            (data.copyright as Image["copyright"]) ||
            existing?.copyright || {freeToRead: true, licenses: []}
    }
    demoImages[id] = image
    return image
}

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
                export_templates: exportTemplates,
                document_styles: documentStyles,
                document_templates: documentTemplates
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
        saveImage: async (data, files) => {
            const image = await storeDemoImage(
                data as Record<string, unknown>,
                (files as Record<string, unknown>) || {}
            )
            return {json: {id: image.id}, status: 200}
        },
        saveE2EEImage: async () => ({json: {}, status: 200}),
        saveDocument: async data => {
            console.log("Import save document:", data)
            return {json: {version: 0}, status: 200}
        }
    }

    const imageApi: ImageApi = {
        getImages: async () => ({
            imageCategories: [],
            images: Object.values(demoImages)
        }),
        saveImage: async (data, files = {}) => {
            const image = await storeDemoImage(
                data as Record<string, unknown>,
                files as Record<string, unknown>
            )
            return {
                errormsg: {},
                values: image
            } as SaveImageResponse
        },
        saveCategories: async () => ({entries: []}),
        deleteImages: async (ids) => {
            ids.forEach(id => delete demoImages[id])
            return Promise.resolve()
        }
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
