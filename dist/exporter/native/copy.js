import { SaveCopy as GenericSaveCopy } from "@fiduswriter/document/exporter/native";
import { NativeImporter } from "@fiduswriter/document/importer/native";
import { addAlert, addProgress, gettext, shortFileTitle } from "fwtoolkit";
import { E2EEEncryptor } from "fwtoolkit/e2ee/encryptor";
import { E2EEKeyManager } from "fwtoolkit/e2ee/key-manager";
async function maybeDecryptImage(imageEntry, sourceKey) {
    if (!sourceKey || !imageEntry.file) {
        return;
    }
    if (imageEntry.file_type !== "application/octet-stream") {
        return;
    }
    const fileBuffer = await imageEntry.file.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer);
    let binary = "";
    const chunkSize = 65536;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);
    const decrypted = await E2EEEncryptor.decryptBufferToBase64(base64, sourceKey);
    const mime = imageEntry.original_file_type || "image/png";
    const byteCharacters = atob(decrypted);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    imageEntry.file = new Blob([byteArray], { type: mime });
    imageEntry.file_type = mime;
}
function createNativeImporterBackend(_user, _e2eeOptions, documentImportApi) {
    return {
        createDoc: (template, importId, path, e2ee, files) => {
            const jsonData = {
                template: template.content,
                export_templates: template.exportTemplates,
                document_styles: template.documentStyles,
                import_id: importId
                    ? importId
                    : template.content.attrs
                        ?.import_id,
                template_title: template.content.attrs
                    ?.template,
                path
            };
            if (e2ee?.enabled) {
                jsonData.e2ee = true;
                if (e2ee.salt) {
                    jsonData.e2ee_salt = e2ee.salt;
                }
                if (e2ee.iterations) {
                    jsonData.e2ee_iterations = e2ee.iterations;
                }
            }
            return documentImportApi
                .createDoc(jsonData, files)
                .then(({ json }) => {
                const data = json;
                return {
                    id: data.id,
                    path: data.path,
                    e2ee: data.e2ee,
                    template: data.template
                };
            })
                .catch(error => {
                addAlert("error", gettext("Could not create document"));
                throw error;
            });
        },
        saveImages: async (images, docId, e2ee) => {
            const isE2EE = e2ee?.enabled;
            const imageTranslationTable = {};
            await Promise.all(Object.values(images.db).map(async (imageEntry) => {
                const entry = imageEntry;
                await maybeDecryptImage(entry, e2ee?.sourceKey);
                const encryptedFile = e2ee?.enabled && e2ee.key
                    ? await E2EEEncryptor.encryptImage(entry.file, e2ee.key)
                    : entry.file;
                const jsonData = {
                    doc_id: docId,
                    title: entry.title,
                    copyright: entry.copyright,
                    checksum: entry.checksum
                };
                const files = {
                    image: {
                        file: encryptedFile,
                        filename: entry.image.split("/").pop()
                    }
                };
                const { json } = isE2EE
                    ? await documentImportApi.saveE2EEImage(jsonData, files)
                    : await documentImportApi.saveImage(jsonData, files);
                const response = json;
                imageTranslationTable[entry.id] = response.id;
            }));
            return imageTranslationTable;
        },
        saveDocument: async (saveData, e2ee) => {
            if (e2ee?.enabled && e2ee.key) {
                saveData.content = await E2EEEncryptor.encryptObject(saveData.content, e2ee.key);
                saveData.comments = await E2EEEncryptor.encryptObject(saveData.comments || {}, e2ee.key);
                saveData.bibliography = await E2EEEncryptor.encryptObject(saveData.bibliography, e2ee.key);
                saveData.title = await E2EEEncryptor.encrypt(saveData.title, e2ee.key);
            }
            return documentImportApi
                .saveDocument(saveData)
                .then(({ json }) => {
                const data = json;
                return {
                    added: data.added,
                    updated: data.updated
                };
            })
                .catch(error => {
                addAlert("error", `${gettext("Could not save ")} ${shortFileTitle(saveData.title, "")}`);
                throw error;
            });
        },
        encryptImage: (file, key) => E2EEEncryptor.encryptImage(file, key),
        encryptObject: (obj, key) => E2EEEncryptor.encryptObject(obj, key),
        encrypt: (text, key) => E2EEEncryptor.encrypt(text, key),
        storeKeyInSession: (docId, key) => E2EEKeyManager.storeKeyInSession(docId, key)
    };
}
export class SaveCopy extends GenericSaveCopy {
    constructor(doc, bibDB, imageDB, newUser, importId = null, e2eeOptions = null, documentImportApi) {
        const title = shortFileTitle(doc.title, doc.path || "");
        const task = addProgress("info", `${title}: ${gettext("Creating copy...")}`, { autoClose: 6000 });
        const progressCallback = (message, percentage) => task.update(percentage, message);
        const e2ee = {
            decryptObject: (encrypted, key) => E2EEEncryptor.decryptObject(encrypted, key),
            encryptObject: (obj, key) => E2EEEncryptor.encryptObject(obj, key),
            encrypt: (text, key) => E2EEEncryptor.encrypt(text, key),
            encryptImage: (file, key) => E2EEEncryptor.encryptImage(file, key),
            generateSalt: () => E2EEKeyManager.generateSalt(),
            deriveKey: (password, salt, iterations) => E2EEKeyManager.deriveKey(password, salt, iterations)
        };
        const importDocument = (doc, bibDB, imageDB, httpIncludes, options) => {
            const opts = options;
            return new NativeImporter(doc, bibDB, imageDB, httpIncludes, opts.user, createNativeImporterBackend(opts.user, opts.e2eeOptions ?? null, documentImportApi), {
                importId: opts.importId,
                requestedPath: opts.requestedPath,
                e2eeOptions: opts.e2eeOptions ?? null
            }).init();
        };
        super(doc, bibDB, imageDB, newUser, {
            importId,
            e2eeOptions,
            e2ee,
            importDocument,
            progressCallback
        });
    }
}
//# sourceMappingURL=copy.js.map