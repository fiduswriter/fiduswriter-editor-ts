import { gettext, initSettings, interpolate, staticUrl } from "fwtoolkit";
import { Plugin } from "prosemirror-state";
// The citeproc-plus browser build references its bundled CSL style/locale
// files as relative "./assets/..." strings and fetches them against the
// *document* base URL (it only resolves them via `import.meta.url` in the
// Node build). In an embedded/static host the document base differs from the
// module location, so resolve those fetches against this module's URL
// instead. Guarded to only rewrite the citeproc asset pattern.
if (typeof window !== "undefined") {
    const moduleBase = new URL(".", import.meta.url).href;
    const originalFetch = window.fetch.bind(window);
    window.fetch = ((input, init) => {
        if (typeof input === "string" && input.startsWith("./assets/")) {
            input = new URL(input, moduleBase).href;
        }
        return originalFetch(input, init);
    });
}
function confirmedDocPlugin(options) {
    const editor = options.editor;
    return new Plugin({
        state: {
            init: (_config, state) => {
                editor.docInfo.confirmedDoc = state.doc;
                return null;
            },
            apply: (_tr, _value, _oldState, newState) => {
                editor.docInfo.confirmedDoc = newState.doc;
                return null;
            }
        }
    });
}
class ConfirmedDocEditorPlugin {
    editor;
    constructor(editor) {
        this.editor = editor;
    }
    init() {
        this.editor.statePlugins.push([
            confirmedDocPlugin,
            () => ({ editor: this.editor })
        ]);
    }
}
async function loadLocaleCatalog(locale) {
    try {
        const response = await fetch(`../locale/${locale}/messages.json`);
        if (!response.ok) {
            return {};
        }
        return (await response.json());
    }
    catch {
        return {};
    }
}
function createGettext(catalog) {
    return function gettextImpl(msgid) {
        return catalog[msgid] || msgid;
    };
}
function defaultStaticUrl(basePath) {
    return (path) => {
        if (path.startsWith("css/editor/")) {
            return `${basePath}css/${path.slice("css/editor/".length)}`;
        }
        if (path === "css/bibliography/bibliography.css") {
            return `${basePath}css/bibliography.css`;
        }
        if (path.startsWith("css/")) {
            return `${basePath}${path}`;
        }
        return `${basePath}static/${path}`;
    };
}
function ensureResetCSS(basePath) {
    const href = `${basePath}css/reset.css`;
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`) ||
        document.querySelector('link[rel="stylesheet"][href$="css/reset.css"]')) {
        return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.insertBefore(link, document.head.firstChild);
}
/**
 * Create and initialize a statically served Fidus Writer editor.
 *
 * This is the high-level entry point for running `@fiduswriter/editor` without
 * a backend server. It sets up the runtime globals, loads locale strings,
 * creates the static app shell, and initializes the editor.
 *
 * The lower-level {@link Editor} constructor and {@link createStaticApp} are
 * still available for server-backed deployments or advanced customization.
 */
export async function createStaticEditor(config) {
    // The editor source expects these Fidus Writer runtime helpers as globals.
    // They must be present before any editor module is evaluated, because some
    // editor modules call them at the top level.
    ;
    window.gettext = gettext;
    window.interpolate = interpolate;
    window.staticUrl = staticUrl;
    const locale = config.locale || "en";
    const catalog = config.localeCatalog ?? (await loadLocaleCatalog(locale));
    const localeGettext = config.gettext ?? createGettext(catalog);
    const basePath = config.staticBasePath ??
        window.location.pathname.replace(/\/(?:editor\/(?:index\.html)?|index\.html)$/, "/");
    ensureResetCSS(basePath);
    initSettings({
        apiUrl: url => url,
        apiUrlMap: {},
        getCsrfToken: () => "",
        gettext: localeGettext,
        interpolate: (fmt, args, named) => {
            if (named) {
                return fmt.replace(/%\(([^)]+)\)s?/g, (_match, key) => {
                    const value = args[key];
                    return value !== undefined ? String(value) : "";
                });
            }
            let index = 0;
            return fmt.replace(/%s/g, () => {
                const value = args[index++];
                return value !== undefined ? String(value) : "";
            });
        },
        staticUrl: defaultStaticUrl(basePath)
    });
    const username = config.username || "User";
    const user = config.user ??
        {
            id: config.userId ?? 1,
            username,
            emails: [{ address: "user@example.com", primary: true }],
            name: username,
            is_authenticated: true
        };
    let csl = config.csl;
    if (!csl) {
        const { createCSL } = await import("@fiduswriter/document/citeproc-plus");
        csl = await createCSL();
        // createCSL replaces getStyle/getLocale with versions that only look at
        // pre-registered styles. Restore the prototype methods so the bundled
        // style/locale chunks are loaded dynamically.
        const cslProto = Object.getPrototypeOf(csl);
        csl.getStyle = cslProto.getStyle;
        csl.getLocale = cslProto.getLocale;
    }
    const { createStaticApp } = await import("./static_app.js");
    const app = await createStaticApp({
        ...config,
        locale,
        gettext: localeGettext,
        csl,
        onSaveDocument: config.onSaveDocument
    });
    // Prime the user bibliography and image databases so dialogs that read
    // from them see empty but valid stores.
    await Promise.all([
        app.bibDB.getDB(),
        app.imageDB.getDB()
    ]);
    const docInfo = (await config.documentData()).doc_info;
    const docId = docInfo?.id ?? 1;
    const docPath = docInfo?.path ?? "";
    const { Editor } = await import("./index.js");
    const plugins = config.plugins ?? [];
    // In static mode there is no server to confirm a document version, so keep
    // the confirmed document in sync with the current editor state. This ensures
    // exports and printing use the latest edits.
    plugins.push([app.name, { ConfirmedDocEditorPlugin }]);
    let mount;
    if (config.mount) {
        mount =
            typeof config.mount === "string"
                ? document.querySelector(config.mount)
                : config.mount;
        if (!mount) {
            throw new Error(`createStaticEditor: mount element not found (${String(config.mount)})`);
        }
    }
    const editor = new Editor({ app, user, mount }, docPath, String(docId), plugins);
    await editor.init();
    return editor;
}
//# sourceMappingURL=static_editor.js.map