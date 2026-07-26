import type {
    BibDB,
    ImageDB,
    NativeImporterBackend,
    User
} from "@fiduswriter/document"
import {FidusFileImporter} from "@fiduswriter/document/importer/native"
import {DocxImporter} from "@fiduswriter/document/importer/docx"
import {OdtImporter} from "@fiduswriter/document/importer/odt"
import {PandocImporter} from "@fiduswriter/document/importer/pandoc"
import JSZip from "jszip"

import defaultTemplate from "./default-template.json" assert {type: "json"}
import templateData from "./document-template-data.json" assert {type: "json"}

let nextDocId = 1

export function createImportBackend(
    user: User,
    path: string,
     
    _locale: string
): NativeImporterBackend {
    return {
        createDoc: async () => ({
            id: nextDocId++,
            path,
            e2ee: false
        }),
        saveImages: async (images: ImageDB) => {
            const table: Record<number | string, number> = {}
            Object.keys(images.db).forEach((id, index) => {
                table[id] = index + 1
            })
            return table
        },
        saveDocument: async () => ({
            added: Date.now(),
            updated: Date.now()
        })
    }
}

export function createDefaultDocument(): Record<string, unknown> {
    const content = JSON.parse(
        JSON.stringify(templateData.documentTemplate.content)
    ) as Record<string, unknown>
    content.attrs = Object.assign(
        {},
        (defaultTemplate as Record<string, unknown>).attrs,
        content.attrs
    )
    return content
}

export async function importFidusFile(
    file: File,
    user: User,
    locale: string
): Promise<{doc: Record<string, unknown>; docInfo: Record<string, unknown>}> {
    const path = file.name.replace(/\.fidus$/i, "")
    const backend = createImportBackend(user, path, locale)
    const importer = new FidusFileImporter(file, user, path, backend, {
        e2eeOptions: null
    })
    const result = await importer.init()
    if (!result.ok || !result.doc) {
        throw new Error(result.statusText || "Failed to import Fidus file.")
    }
    return {doc: result.doc as Record<string, unknown>, docInfo: result.docInfo as Record<string, unknown>}
}

export async function importDocxFile(
    file: File,
    user: User,
    locale: string
): Promise<{doc: Record<string, unknown>; docInfo: Record<string, unknown>}> {
    const path = file.name.replace(/\.docx$/i, "")
    const backend = createImportBackend(user, path, locale)
    const importer = new DocxImporter(
        file,
        user,
        path,
        null,
        {
            getTemplate: async () => ({content: createDefaultDocument()}),
            nativeBackend: backend,
            e2eeOptions: null
        }
    )
    const result = await importer.init()
    if (!result.ok || !result.doc) {
        throw new Error(result.statusText || "Failed to import DOCX file.")
    }
    return {doc: result.doc, docInfo: result.docInfo as Record<string, unknown>}
}

export async function importOdtFile(
    file: File,
    user: User,
    locale: string
): Promise<{doc: Record<string, unknown>; docInfo: Record<string, unknown>}> {
    const path = file.name.replace(/\.odt$/i, "")
    const backend = createImportBackend(user, path, locale)
    const importer = new OdtImporter(
        file,
        user,
        path,
        null,
        {
            getTemplate: async () => ({content: createDefaultDocument()}),
            nativeBackend: backend,
            e2eeOptions: null
        }
    )
    const result = await importer.init()
    if (!result.ok || !result.doc) {
        throw new Error(result.statusText || "Failed to import ODT file.")
    }
    return {doc: result.doc, docInfo: result.docInfo as Record<string, unknown>}
}

export async function importPandocFile(
    file: File,
    user: User,
    locale: string
): Promise<{doc: Record<string, unknown>; docInfo: Record<string, unknown>}> {
    const path = file.name.replace(/\.json$/i, "")
    const backend = createImportBackend(user, path, locale)
    const importer = new PandocImporter(
        file,
        user,
        path,
        null,
        {
            getTemplate: async () => ({content: createDefaultDocument()}),
            importBibliography: async () => ({}),
            nativeBackend: backend,
            e2eeOptions: null
        }
    )
    const result = await importer.init()
    if (!result.ok || !result.doc) {
        throw new Error(result.statusText || "Failed to import Pandoc JSON file.")
    }
    return {doc: result.doc, docInfo: result.docInfo as Record<string, unknown>}
}

export async function importDocument(
    file: File,
    user: User,
    locale: string
): Promise<{doc: Record<string, unknown>; docInfo: Record<string, unknown>}> {
    const ext = file.name.split(".").pop()?.toLowerCase()
    switch (ext) {
        case "fidus":
            return importFidusFile(file, user, locale)
        case "docx":
            return importDocxFile(file, user, locale)
        case "odt":
            return importOdtFile(file, user, locale)
        case "json":
            return importPandocFile(file, user, locale)
        default:
            throw new Error(`Unsupported file type: ${ext}`)
    }
}

export interface TemplateDefinition {
    title: string
    content: Record<string, unknown>
    exportTemplates: Record<string, unknown>[]
    documentStyles: Record<string, unknown>[]
}

export async function applyTemplate(
    file: File
): Promise<TemplateDefinition> {
    const zip = await JSZip.loadAsync(file)
    const textFiles: Record<string, string> = {}
    const filenames: string[] = []
    zip.forEach(filename => filenames.push(filename))
    await Promise.all(
        filenames
            .filter(filename => !filename.endsWith("/"))
            .map(async filename => {
                const isText =
                    ["mimetype", "filetype-version"].includes(filename) ||
                    filename.endsWith(".json")
                const content = await zip
                    .file(filename)
                    ?.async(isText ? "string" : "blob")
                if (content !== undefined) {
                    textFiles[filename] = content as string
                }
            })
    )

    const template = JSON.parse(textFiles["template.json"])
    const exportTemplates = JSON.parse(textFiles["exporttemplates.json"])
    const documentStyles = JSON.parse(textFiles["documentstyles.json"])

    return {
        title: template.attrs?.template || file.name,
        content: template,
        exportTemplates,
        documentStyles
    }
}

export function createEmptyBibDB(): BibDB {
    return {db: {}}
}

export function createEmptyImageDB(): ImageDB {
    return {db: {}}
}
