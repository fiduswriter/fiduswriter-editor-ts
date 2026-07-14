import {SaveCopy as GenericSaveCopy} from "@fiduswriter/document/exporter/native"
import {addAlert, addProgress, gettext, postJson, shortFileTitle} from "fwtoolkit"
import {E2EEEncryptor} from "../../e2ee/encryptor.js"
import {E2EEKeyManager} from "../../e2ee/key-manager.js"
import {NativeImporter} from "@fiduswriter/document/importer/native"

async function maybeDecryptImage(imageEntry, sourceKey) {
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
        binary += String.fromCharCode.apply(null, chunk)
    }
    const base64 = btoa(binary)
    const decrypted = await E2EEEncryptor.decryptBufferToBase64(base64, sourceKey)
    const mime = imageEntry.original_file_type || "image/png"
    const byteCharacters = atob(decrypted)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    imageEntry.file = new Blob([byteArray], {type: mime})
    imageEntry.file_type = mime
}

function createNativeImporterBackend(user, e2eeOptions) {
    return {
        createDoc: (template, importId, path, e2ee, files) => {
            const jsonData = {
                template: template.content,
                export_templates: template.exportTemplates,
                document_styles: template.documentStyles,
                import_id: importId
                    ? importId
                    : template.content.attrs.import_id,
                template_title: template.content.attrs.template,
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
            return postJson("/api/document/import/create/", jsonData, files)
                .then(({json}) => ({
                    id: json.id,
                    path: json.path,
                    e2ee: json.e2ee,
                    template: json.template
                }))
                .catch(error => {
                    addAlert("error", gettext("Could not create document"))
                    throw error
                })
        },
        saveImages: async (images, docId, e2ee) => {
            const isE2EE = e2ee?.enabled
            const endpoint = isE2EE
                ? "/api/document/e2ee_image/"
                : "/api/document/import/image/"
            const imageTranslationTable = {}
            await Promise.all(
                Object.values(images.db).map(async imageEntry => {
                    await maybeDecryptImage(imageEntry, e2ee?.sourceKey)
                    const encryptedFile =
                        e2ee?.enabled && e2ee.key
                            ? await E2EEEncryptor.encryptImage(
                                  imageEntry.file,
                                  e2ee.key
                              )
                            : imageEntry.file
                    const jsonData = {
                        doc_id: docId,
                        title: imageEntry.title,
                        copyright: imageEntry.copyright,
                        checksum: imageEntry.checksum
                    }
                    const files = {
                        image: {
                            file: encryptedFile,
                            filename: imageEntry.image.split("/").pop()
                        }
                    }
                    const {json} = await postJson(endpoint, jsonData, files)
                    imageTranslationTable[imageEntry.id] = json.id
                })
            )
            return imageTranslationTable
        },
        saveDocument: async (saveData, e2ee) => {
            if (e2ee?.enabled && e2ee.key) {
                saveData.content = await E2EEEncryptor.encryptObject(
                    saveData.content,
                    e2ee.key
                )
                saveData.comments = await E2EEEncryptor.encryptObject(
                    saveData.comments || {},
                    e2ee.key
                )
                saveData.bibliography = await E2EEEncryptor.encryptObject(
                    saveData.bibliography,
                    e2ee.key
                )
                saveData.title = await E2EEEncryptor.encrypt(
                    saveData.title,
                    e2ee.key
                )
            }
            return postJson("/api/document/import/", saveData)
                .then(({json}) => ({added: json.added, updated: json.updated}))
                .catch(error => {
                    addAlert(
                        "error",
                        `${gettext("Could not save ")} ${shortFileTitle(
                            saveData.title,
                            ""
                        )}`
                    )
                    throw error
                })
        },
        encryptImage: E2EEEncryptor.encryptImage.bind(E2EEEncryptor),
        encryptObject: E2EEEncryptor.encryptObject.bind(E2EEEncryptor),
        encrypt: E2EEEncryptor.encrypt.bind(E2EEEncryptor),
        storeKeyInSession: E2EEKeyManager.storeKeyInSession.bind(E2EEKeyManager)
    }
}

export class SaveCopy extends GenericSaveCopy {
    constructor(
        doc,
        bibDB,
        imageDB,
        newUser,
        importId = null,
        e2eeOptions = null
    ) {
        const title = shortFileTitle(doc.title, doc.path || "")
        const task = addProgress(
            "info",
            `${title}: ${gettext("Creating copy...")}`,
            {autoClose: 6000}
        )
        const progressCallback = (message, percentage) =>
            task.update(percentage, message)
        const e2ee = {
            decryptObject: E2EEEncryptor.decryptObject.bind(E2EEEncryptor),
            encryptObject: E2EEEncryptor.encryptObject.bind(E2EEEncryptor),
            encrypt: E2EEEncryptor.encrypt.bind(E2EEEncryptor),
            encryptImage: E2EEEncryptor.encryptImage.bind(E2EEEncryptor),
            generateSalt: E2EEKeyManager.generateSalt.bind(E2EEKeyManager),
            deriveKey: E2EEKeyManager.deriveKey.bind(E2EEKeyManager)
        }

        const importDocument = (doc, bibDB, imageDB, httpIncludes, options) =>
            new NativeImporter(
                doc,
                bibDB,
                imageDB,
                httpIncludes,
                options.user,
                createNativeImporterBackend(options.user, options.e2eeOptions),
                {
                    importId: options.importId,
                    requestedPath: options.requestedPath,
                    e2eeOptions: options.e2eeOptions
                }
            ).init()

        super(doc, bibDB, imageDB, newUser, {
            importId,
            e2eeOptions,
            e2ee,
            importDocument,
            progressCallback
        })
    }
}
