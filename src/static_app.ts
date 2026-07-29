import type {CSL, EditorImageDB} from "./types.js"
import {BibliographyDB} from "@fiduswriter/bibliography-manager/database"
import type {BibliographyApi} from "@fiduswriter/bibliography-manager"
import {ImageDB} from "@fiduswriter/image-manager/database"
import type {ImageApi} from "@fiduswriter/image-manager"
import type {Image, SaveImageResponse} from "@fiduswriter/image-manager/types"
import {FW_DOCUMENT_VERSION} from "@fiduswriter/document/schema"
import {extractTemplate} from "@fiduswriter/document/importer/native/extract_template"

import type {
    EditorApp,
    EditorContactsApi,
    EditorDocumentApi,
    EditorDocumentImportApi
} from "./types.js"

export interface StaticDocumentStyle {
    title: string
    slug: string
    contents: string
    documentstylefile_set: Array<[string, string]>
}

export interface StaticExportTemplate {
    title: string
    file_type: string
    template_file: string
}

export interface StaticDocumentTemplate {
    title: string
}

export interface StaticAppConfig {
    /** Locale code used by the editor, e.g. "en". */
    locale: string
    /** gettext function for UI strings. */
    gettext: (msgid: string) => string
    /** CSL engine instance. */
    csl: CSL
    /**
     * Function returning the document payload the editor should load.
     * Called whenever the editor refreshes document data from the server.
     */
    documentData: () => Promise<{
        doc: Record<string, unknown>
        doc_info: Record<string, unknown>
        time: number
    }>
    /**
     * Optional callback returning the current document content node.
     * Used by File > Download to extract a template definition from the document.
     */
    getDocContent?: () => Record<string, unknown> | undefined
    /** Initial image entries keyed by image id. */
    initialImages?: Record<number, Image>
    /** Document styles available for the document template. */
    documentStyles?: StaticDocumentStyle[]
    /** Export templates available for the document template. */
    exportTemplates?: StaticExportTemplate[]
    /** Document templates keyed by import id. */
    documentTemplates?: Record<string, StaticDocumentTemplate>
    /** Optional override for the template API response. */
    getTemplateForDoc?: (
        docId: string | number,
        token: string | false
    ) => Promise<Record<string, unknown>>
    /** Application name. */
    appName?: string
    /** Routes table used by the app router. */
    routes?: Record<string, {app: string}>
    /**
     * Optional handler called when the editor tries to save the document.
     * Defaults to a no-op that returns version 0.
     */
    onSaveDocument?: (data: Record<string, unknown>) => Promise<{
        json: Record<string, unknown>
        status: number
    }>
    /**
     * Optional user preferences that control inline editing helpers.
     * Recognized keys include `inline_references` and `inline_math`.
     */
    userPreferences?: Record<string, boolean>
}

interface StoredImage {
    id: number
    title: string
    file_type: string
    image: string
    thumbnail?: string
    width: number
    height: number
    added: number
    cats: number[]
    copyright: Image["copyright"]
    [key: string]: unknown
}

function fileToDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

function getImageDimensions(
    dataUrl: string
): Promise<{width: number; height: number}> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({width: img.width, height: img.height})
        img.onerror = reject
        img.src = dataUrl
    })
}

/**
 * Create an {@link EditorApp} for a statically served Fidus Writer editor.
 *
 * This wires up in-memory API connectors so that the editor can run without a
 * backend server. It is used by the standalone demo and can be used by any
 * static deployment of `@fiduswriter/editor`.
 */
export async function createStaticApp(
    config: StaticAppConfig
): Promise<EditorApp> {
    const documentStyles = config.documentStyles || []
    const exportTemplates = config.exportTemplates || []
    const documentTemplates = config.documentTemplates || {}

    // In-memory store for images uploaded during this session.
    const sessionImages: Record<number, StoredImage> = {}
    let nextImageId = 1

    if (config.initialImages) {
        Object.entries(config.initialImages).forEach(([id, image]) => {
            sessionImages[Number(id)] = image as StoredImage
        })
    }

    async function storeImage(
        data: Record<string, unknown>,
        files: Record<string, unknown>
    ): Promise<StoredImage> {
        const id = data.id ? Number(data.id) : nextImageId++
        const existing = sessionImages[id]
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
            fileType =
                (data.original_file_type as string) ||
                (file as File).type ||
                "image/png"
            const dimensions = await getImageDimensions(imageUrl)
            width = dimensions.width
            height = dimensions.height
        }

        const image: StoredImage = {
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
        sessionImages[id] = image
        return image
    }

    const defaultGetTemplateForDoc = async () => {
        const docContent = config.getDocContent?.() as Record<string, unknown> | undefined
        const template = docContent
            ? extractTemplate(docContent as unknown as any)
            : null
        const title =
            ((docContent as any)?.attrs?.template as string) ||
            ((template as any)?.content?.attrs?.template as string) ||
            ""
        return {
            json: {
                id: 1,
                title,
                content: template?.content ?? {},
                doc_version: FW_DOCUMENT_VERSION,
                export_templates: exportTemplates.map(template => ({
                    fields: {
                        template_file: template.template_file,
                        file_type: template.file_type,
                        title: template.title
                    }
                })),
                document_styles: documentStyles.map(style => ({
                    fields: {
                        contents: style.contents,
                        slug: style.slug,
                        title: style.title,
                        documentstylefile_set: style.documentstylefile_set
                    }
                }))
            },
            status: 200
        }
    }

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
            if (config.onSaveDocument) {
                return config.onSaveDocument(data)
            }
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
        getTemplateForDoc: async (id, token) => {
            if (config.getTemplateForDoc) {
                return {
                    json: await config.getTemplateForDoc(id, token),
                    status: 200
                }
            }
            return defaultGetTemplateForDoc()
        }
    }

    const documentImportApi: EditorDocumentImportApi = {
        createDoc: async () => ({json: {id: 1}, status: 200}),
        saveImage: async (data, files) => {
            const image = await storeImage(
                data as Record<string, unknown>,
                (files as Record<string, unknown>) || {}
            )
            return {json: {id: image.id}, status: 200}
        },
        saveE2EEImage: async () => ({json: {}, status: 200}),
        saveDocument: async data => {
            if (config.onSaveDocument) {
                return config.onSaveDocument(data)
            }
            return {json: {version: 0}, status: 200}
        }
    }

    const imageApi: ImageApi = {
        getImages: async () => ({
            imageCategories: [],
            images: Object.values(sessionImages) as Image[]
        }),
        saveImage: async (data, files = {}) => {
            const image = await storeImage(
                data as Record<string, unknown>,
                files as Record<string, unknown>
            )
            return {
                errormsg: {},
                values: image
            } as SaveImageResponse
        },
        saveCategories: async () => ({entries: []}),
        deleteImages: async ids => {
            ids.forEach(id => delete sessionImages[id])
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

    const appName = config.appName || "fiduswriter-static-editor"

    const app = {
        name: appName,
        routes: config.routes || {
            "": {app: "document"},
            document: {app: "document"}
        },
        goTo: () => {},
        isOffline: () => false,
        settings: {
            APPS: [appName],
            EDITOR_SAVE_MODE: "external",
            EDITOR_ONLY_MODE: true,
            E2EE_MODE: "disabled",
            LANGUAGE: config.locale
        },
        csl: config.csl,
        config: {
            user: {
                preferences: config.userPreferences ?? {}
            }
        },
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
    imageDB.setImage = (_id: number, _data: Record<string, unknown>) => {}

    ;(app as any).bibDB = bibDB
    ;(app as any).imageDB = imageDB

    return app
}
