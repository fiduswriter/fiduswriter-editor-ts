import { BibliographyDB } from "@fiduswriter/bibliography-manager/database";
import { ImageDB } from "@fiduswriter/image-manager/database";
import { FW_DOCUMENT_VERSION } from "@fiduswriter/document/schema";
import { extractTemplate } from "@fiduswriter/document/importer/native/extract_template";
function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function getImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = dataUrl;
    });
}
/**
 * Create an {@link EditorApp} for a statically served Fidus Writer editor.
 *
 * This wires up in-memory API connectors so that the editor can run without a
 * backend server. It is used by the standalone demo and can be used by any
 * static deployment of `@fiduswriter/editor`.
 */
export async function createStaticApp(config) {
    const documentStyles = config.documentStyles || [];
    const exportTemplates = config.exportTemplates || [];
    const documentTemplates = config.documentTemplates || {};
    // In-memory store for images uploaded during this session.
    const sessionImages = {};
    let nextImageId = 1;
    if (config.initialImages) {
        Object.entries(config.initialImages).forEach(([id, image]) => {
            sessionImages[Number(id)] = image;
        });
    }
    async function storeImage(data, files) {
        const id = data.id ? Number(data.id) : nextImageId++;
        const existing = sessionImages[id];
        const file = files?.image?.file ??
            files?.image ??
            data.image;
        let imageUrl = existing?.image ?? "";
        let fileType = existing?.file_type ?? "png";
        let width = existing?.width ?? 0;
        let height = existing?.height ?? 0;
        if (file) {
            imageUrl = await fileToDataUrl(file);
            fileType =
                data.original_file_type ||
                    file.type ||
                    "image/png";
            const dimensions = await getImageDimensions(imageUrl);
            width = dimensions.width;
            height = dimensions.height;
        }
        const image = {
            id,
            title: data.title || existing?.title || "",
            file_type: fileType,
            image: imageUrl,
            width,
            height,
            added: existing?.added || Date.now(),
            cats: data.cats || existing?.cats || [],
            copyright: data.copyright ||
                existing?.copyright || { freeToRead: true, licenses: [] }
        };
        sessionImages[id] = image;
        return image;
    }
    const defaultGetTemplateForDoc = async () => {
        const docContent = config.getDocContent?.();
        const template = docContent
            ? extractTemplate(docContent)
            : null;
        const title = docContent?.attrs?.template ||
            template?.content?.attrs?.template ||
            "";
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
        };
    };
    const documentApi = {
        createDocument: async () => ({ json: { id: 1 }, status: 200 }),
        getWebSocketBase: async () => ({ json: { ws_base: "" }, status: 200 }),
        getDocumentStyles: async () => ({
            json: {
                export_templates: exportTemplates,
                document_styles: documentStyles,
                document_templates: documentTemplates
            },
            status: 200
        }),
        getDocumentData: async () => {
            const data = await config.documentData();
            return { json: data, status: 200 };
        },
        saveDocument: async (data) => {
            if (config.onSaveDocument) {
                return config.onSaveDocument(data);
            }
            return { json: { version: 0 }, status: 200 };
        },
        commentNotify: async () => Promise.resolve(),
        requestAccess: async () => ({ json: {}, status: 200 }),
        validateShareToken: async () => ({ json: {}, status: 404 }),
        listShareTokens: async () => ({ json: [], status: 200 }),
        createShareToken: async () => ({ json: {}, status: 200 }),
        revokeShareToken: async () => ({ json: {}, status: 200 }),
        getAccessRights: async () => ({ json: {}, status: 200 }),
        saveAccessRights: async () => Promise.resolve(),
        saveE2EEImage: async () => ({ json: {}, status: 200 }),
        deleteE2EEImage: async () => Promise.resolve(),
        uploadRevision: async () => Promise.resolve(),
        getTemplateForDoc: async (id, token) => {
            if (config.getTemplateForDoc) {
                return {
                    json: await config.getTemplateForDoc(id, token),
                    status: 200
                };
            }
            return defaultGetTemplateForDoc();
        }
    };
    const documentImportApi = {
        createDoc: async () => ({ json: { id: 1 }, status: 200 }),
        saveImage: async (data, files) => {
            const image = await storeImage(data, files || {});
            return { json: { id: image.id }, status: 200 };
        },
        saveE2EEImage: async () => ({ json: {}, status: 200 }),
        saveDocument: async (data) => {
            if (config.onSaveDocument) {
                return config.onSaveDocument(data);
            }
            return { json: { version: 0 }, status: 200 };
        }
    };
    const imageApi = {
        getImages: async () => ({
            imageCategories: [],
            images: Object.values(sessionImages)
        }),
        saveImage: async (data, files = {}) => {
            const image = await storeImage(data, files);
            return {
                errormsg: {},
                values: image
            };
        },
        saveCategories: async () => ({ entries: [] }),
        deleteImages: async (ids) => {
            ids.forEach(id => delete sessionImages[id]);
            return Promise.resolve();
        }
    };
    const bibliographyApi = {
        getDB: async () => ({
            bib_categories: [],
            bib_list: [],
            last_modified: -1,
            number_of_entries: 0,
            user_id: 1
        }),
        saveBibEntries: async (tmpDB) => ({
            id_translations: Object.keys(tmpDB).map(tmpId => [
                Number.parseInt(tmpId),
                Number.parseInt(tmpId)
            ])
        }),
        saveCategories: async () => ({ entries: [] }),
        deleteCategory: async () => new Response(JSON.stringify({}), { status: 200 }),
        deleteBibEntries: async () => new Response(JSON.stringify({}), { status: 200 })
    };
    const contactsApi = {
        add: async () => ({ json: {}, status: 200 })
    };
    const appName = config.appName || "fiduswriter-static-editor";
    const app = {
        name: appName,
        routes: config.routes || {
            "": { app: "document" },
            document: { app: "document" }
        },
        goTo: () => { },
        isOffline: () => false,
        settings: {
            APPS: [appName],
            EDITOR_SAVE_MODE: config.saveMode ?? "external",
            EDITOR_ONLY_MODE: true,
            E2EE_MODE: "disabled",
            LANGUAGE: config.locale,
            // Hosts without a Fidus Writer backend (embedded / standalone
            // editor) hide the file-menu items that need one: Share, Save
            // revision, Create copy.
            SHOW_FILE_MENU_ITEMS: config.fileMenuItems ?? true
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
            contacts: contactsApi,
            ...config.apiConnectors
        }
    };
    const bibDB = new BibliographyDB(app);
    const imageDB = new ImageDB(app);
    imageDB.setImage = (_id, _data) => { };
    app.bibDB = bibDB;
    app.imageDB = imageDB;
    return app;
}
//# sourceMappingURL=static_app.js.map