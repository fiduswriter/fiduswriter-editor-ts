import type {
    BibDB,
    ExportDoc,
    ImageDB,
    ImageDBEntry,
    SaveCopyE2EE,
    Template,
    User
} from "@fiduswriter/document"
import {SaveCopy as GenericSaveCopy} from "@fiduswriter/document/exporter/native"
import {NativeImporter} from "@fiduswriter/document/importer/native"
import {addAlert, addProgress, gettext, shortFileTitle} from "fwtoolkit"
import {E2EEEncryptor} from "fwtoolkit/e2ee/encryptor"
import {E2EEKeyManager} from "fwtoolkit/e2ee/key-manager"
import type {EditorDocumentImportApi} from "../../types.js"

type ProgressCallback = (message: string, percentage?: number | null) => void

type ImportDocument = (
    doc: Record<string, unknown>,
    bibDB: BibDB,
    imageDB: ImageDB,
    httpIncludes: Array<{url: string; filename: string}>,
    options: Record<string, unknown>
) => Promise<{doc: Record<string, unknown>; docInfo: Record<string, unknown>}>

interface ImageEntry extends ImageDBEntry {
    file?: Blob
    checksum?: string
    original_file_type?: string
    image: string
}

interface E2EEOptions {
    enabled?: boolean
    key?: CryptoKey
    sourceKey?: CryptoKey
    targetE2EE?: boolean
    targetPassword?: string
    salt?: string
    iterations?: number
}

interface CreateDocumentResult {
    id: number
    path: string
    e2ee?: boolean
    template?: string
}

interface SaveDocumentResult {
    added: number
    updated: number
}

interface NativeImporterBackend {
    createDoc: (
        template: Template,
        importId: string | number | null,
        requestedPath: string,
        e2eeOptions: E2EEOptions | null,
        files: Record<string, File[]>
    ) => Promise<CreateDocumentResult>
    saveImages: (
        images: ImageDB,
        docId: number,
        e2eeOptions: E2EEOptions | null
    ) => Promise<Record<number | string, number>>
    saveDocument: (
        saveData: Record<string, unknown>,
        e2eeOptions: E2EEOptions | null
    ) => Promise<SaveDocumentResult>
    encryptImage: (file: Blob, key: CryptoKey) => Promise<Blob>
    encryptObject: (obj: unknown, key: CryptoKey) => Promise<unknown>
    encrypt: (text: string, key: CryptoKey) => Promise<unknown>
    storeKeyInSession: (docId: number, key: CryptoKey) => Promise<void>
}

interface ImportDocumentOptions extends Record<string, unknown> {
    user: User
    importId?: string | number | null
    requestedPath?: string
    e2eeOptions?: E2EEOptions | null
}

async function maybeDecryptImage(
    imageEntry: ImageEntry,
    sourceKey: CryptoKey | undefined
): Promise<void> {
    if (!sourceKey || !imageEntry.file) {
        return
    }
    if (imageEntry.file_type !== "application/octet-stream") {
        return
    }
    const fileBuffer = await imageEntry.file.arrayBuffer()
    const bytes = new Uint8Array(fileBuffer)
    let binary = ""
    const chunkSize = 65536
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize)
        binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    const base64 = btoa(binary)
    const decrypted = await E2EEEncryptor.decryptBufferToBase64(base64, sourceKey)
    const mime = imageEntry.original_file_type || "image/png"
    const byteCharacters = atob(decrypted)
    const byteNumbers = new Array<number>(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    imageEntry.file = new Blob([byteArray], {type: mime})
    imageEntry.file_type = mime
}

function createNativeImporterBackend(
    _user: User,
    _e2eeOptions: E2EEOptions | null,
    documentImportApi: EditorDocumentImportApi
): NativeImporterBackend {
    return {
        createDoc: (template, importId, path, e2ee, files) => {
            const jsonData: Record<string, unknown> = {
                template: template.content,
                export_templates: template.exportTemplates,
                document_styles: template.documentStyles,
                import_id: importId
                    ? importId
                    : (template.content.attrs as Record<string, unknown> | undefined)
                          ?.import_id,
                template_title: (template.content.attrs as Record<string, unknown> | undefined)
                    ?.template,
                path
            }
            if (e2ee?.enabled) {
                jsonData.e2ee = true
                if (e2ee.salt) {
                    jsonData.e2ee_salt = e2ee.salt
                }
                if (e2ee.iterations) {
                    jsonData.e2ee_iterations = e2ee.iterations
                }
            }
            return documentImportApi
                .createDoc(jsonData, files)
                .then(({json}) => {
                    const data = json as Record<string, unknown>
                    return {
                        id: data.id as number,
                        path: data.path as string,
                        e2ee: data.e2ee as boolean | undefined,
                        template: data.template as string | undefined
                    }
                })
                .catch(error => {
                    addAlert("error", gettext("Could not create document"))
                    throw error
                })
        },
        saveImages: async (images, docId, e2ee) => {
            const isE2EE = e2ee?.enabled
            const imageTranslationTable: Record<number | string, number> = {}
            await Promise.all(
                Object.values(images.db).map(async imageEntry => {
                    const entry = imageEntry as ImageEntry
                    await maybeDecryptImage(entry, e2ee?.sourceKey)
                    const encryptedFile =
                        e2ee?.enabled && e2ee.key
                            ? await E2EEEncryptor.encryptImage(
                                  entry.file as Blob,
                                  e2ee.key
                              )
                            : entry.file
                    const jsonData: Record<string, unknown> = {
                        doc_id: docId,
                        title: entry.title,
                        copyright: entry.copyright,
                        checksum: entry.checksum
                    }
                    const files = {
                        image: {
                            file: encryptedFile as Blob,
                            filename: entry.image.split("/").pop() as string
                        }
                    }
                    const {json} = isE2EE
                        ? await documentImportApi.saveE2EEImage(jsonData, files)
                        : await documentImportApi.saveImage(jsonData, files)
                    const response = json as Record<string, unknown>
                    imageTranslationTable[entry.id] = response.id as number
                })
            )
            return imageTranslationTable
        },
        saveDocument: async (saveData, e2ee) => {
            if (e2ee?.enabled && e2ee.key) {
                saveData.content = await E2EEEncryptor.encryptObject(
                    saveData.content as object,
                    e2ee.key
                )
                saveData.comments = await E2EEEncryptor.encryptObject(
                    saveData.comments || {},
                    e2ee.key
                )
                saveData.bibliography = await E2EEEncryptor.encryptObject(
                    saveData.bibliography as object,
                    e2ee.key
                )
                saveData.title = await E2EEEncryptor.encrypt(
                    saveData.title as string,
                    e2ee.key
                )
            }
            return documentImportApi
                .saveDocument(saveData)
                .then(({json}) => {
                    const data = json as Record<string, unknown>
                    return {
                        added: data.added as number,
                        updated: data.updated as number
                    }
                })
                .catch(error => {
                    addAlert(
                        "error",
                        `${gettext("Could not save ")} ${shortFileTitle(
                            saveData.title as string,
                            ""
                        )}`
                    )
                    throw error
                })
        },
        encryptImage: (file, key) => E2EEEncryptor.encryptImage(file, key),
        encryptObject: (obj, key) => E2EEEncryptor.encryptObject(obj as object, key),
        encrypt: (text, key) => E2EEEncryptor.encrypt(text, key),
        storeKeyInSession: (docId, key) => E2EEKeyManager.storeKeyInSession(docId, key)
    }
}

export class SaveCopy extends GenericSaveCopy {
    constructor(
        doc: Record<string, unknown> | ExportDoc,
        bibDB: BibDB,
        imageDB: ImageDB,
        newUser: User,
        importId: string | number | null = null,
        e2eeOptions: E2EEOptions | null = null,
        documentImportApi?: EditorDocumentImportApi
    ) {
        const title = shortFileTitle(doc.title as string, (doc.path as string) || "")
        const task = addProgress(
            "info",
            `${title}: ${gettext("Creating copy...")}`,
            {autoClose: 6000}
        )
        const progressCallback: ProgressCallback = (message, percentage) =>
            task.update(percentage as number | null, message)
        const e2ee: SaveCopyE2EE = {
            decryptObject: (encrypted, key) =>
                E2EEEncryptor.decryptObject(encrypted as string, key),
            encryptObject: (obj, key) =>
                E2EEEncryptor.encryptObject(obj as object, key),
            encrypt: (text, key) => E2EEEncryptor.encrypt(text, key),
            encryptImage: (file, key) => E2EEEncryptor.encryptImage(file, key),
            generateSalt: () => E2EEKeyManager.generateSalt(),
            deriveKey: (password, salt, iterations) =>
                E2EEKeyManager.deriveKey(password, salt, iterations)
        }

        const importDocument: ImportDocument = (
            doc,
            bibDB,
            imageDB,
            httpIncludes,
            options
        ) => {
            const opts = options as ImportDocumentOptions
            return new NativeImporter(
                doc,
                bibDB as unknown as Record<string, unknown>,
                imageDB,
                httpIncludes as unknown as Array<{
                    filename: string
                    content: Blob | ArrayBuffer | string
                }>,
                opts.user,
                createNativeImporterBackend(
                    opts.user,
                    opts.e2eeOptions ?? null,
                    documentImportApi as EditorDocumentImportApi
                ),
                {
                    importId: opts.importId,
                    requestedPath: opts.requestedPath,
                    e2eeOptions: opts.e2eeOptions ?? null
                }
            ).init()
        }

        super(doc as Record<string, unknown>, bibDB, imageDB, newUser, {
            importId,
            e2eeOptions,
            e2ee,
            importDocument,
            progressCallback
        })
    }
}
