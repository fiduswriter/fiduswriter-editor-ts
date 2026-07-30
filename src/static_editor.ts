import {gettext, initSettings, interpolate, staticUrl} from "fwtoolkit"

import type {CSL, EditorUser} from "./types.js"
import type {StaticAppConfig} from "./static_app.js"

import {Plugin} from "prosemirror-state"

import type {Editor} from "./index.js"

export type {StaticAppConfig} from "./static_app.js"

function confirmedDocPlugin(options: unknown): Plugin {
    const editor = (options as {editor: Editor}).editor
    return new Plugin({
        state: {
            init: (_config, state) => {
                editor.docInfo.confirmedDoc = state.doc
                return null
            },
            apply: (_tr, _value, _oldState, newState) => {
                editor.docInfo.confirmedDoc = newState.doc
                return null
            }
        }
    })
}

class ConfirmedDocEditorPlugin {
    editor: Editor

    constructor(editor: Editor) {
        this.editor = editor
    }

    init(): void {
        this.editor.statePlugins.push([
            confirmedDocPlugin,
            () => ({editor: this.editor})
        ])
    }
}

export interface StaticEditorConfig
    extends Omit<StaticAppConfig, "gettext" | "csl"> {
    /** gettext function for UI strings. When omitted, a function backed by `localeCatalog` is used. */
    gettext?: (msgid: string) => string
    /** CSL engine instance. When omitted, a default engine is created. */
    csl?: CSL
    /** Display name for the user. Used to build the user object when `user` is not given. */
    username?: string
    /** User id. Used to build the user object when `user` is not given. Defaults to 1. */
    userId?: number
    /** Pre-built user object. Takes precedence over `username` and `userId`. */
    user?: EditorUser
    /**
     * Base path for resolving static assets.
     * Defaults to the directory containing the current page.
     */
    staticBasePath?: string
    /**
     * Optional locale catalog. When omitted, the catalog is fetched from
     * `../locale/{locale}/messages.json` relative to the current page.
     */
    localeCatalog?: Record<string, string>
    /**
     * Optional callback for save attempts. Receives the document payload.
     */
    onSaveDocument?: (data: Record<string, unknown>) => Promise<{
        json: Record<string, unknown>
        status: number
    }>
    /** Optional extra editor plugins. */
    plugins?: Array<[string, Record<string, unknown>]>
    /**
     * Optional user preferences that control inline editing helpers.
     * Recognized keys include `inline_references` and `inline_math`.
     */
    userPreferences?: Record<string, boolean>
}

async function loadLocaleCatalog(
    locale: string
): Promise<Record<string, string>> {
    try {
        const response = await fetch(`../locale/${locale}/messages.json`)
        if (!response.ok) {
            return {}
        }
        return (await response.json()) as Record<string, string>
    } catch {
        return {}
    }
}

function createGettext(catalog: Record<string, string>) {
    return function gettextImpl(msgid: string): string {
        return catalog[msgid] || msgid
    }
}

function defaultStaticUrl(basePath: string): (path: string) => string {
    return (path: string) => {
        if (path.startsWith("css/editor/")) {
            return `${basePath}css/${path.slice("css/editor/".length)}`
        }
        if (path === "css/bibliography/bibliography.css") {
            return `${basePath}css/bibliography.css`
        }
        if (path.startsWith("css/")) {
            return `${basePath}${path}`
        }
        return `${basePath}static/${path}`
    }
}

function ensureResetCSS(basePath: string): void {
    const href = `${basePath}css/reset.css`
    if (
        document.querySelector(
            `link[rel="stylesheet"][href="${href}"]`
        ) ||
        document.querySelector(
            'link[rel="stylesheet"][href$="css/reset.css"]'
        )
    ) {
        return
    }
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    document.head.insertBefore(link, document.head.firstChild)
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
export async function createStaticEditor(
    config: StaticEditorConfig
): Promise<Editor> {
    // The editor source expects these Fidus Writer runtime helpers as globals.
    // They must be present before any editor module is evaluated, because some
    // editor modules call them at the top level.
    ;(window as any).gettext = gettext
    ;(window as any).interpolate = interpolate
    ;(window as any).staticUrl = staticUrl

    const locale = config.locale || "en"
    const catalog =
        config.localeCatalog ?? (await loadLocaleCatalog(locale))
    const localeGettext = config.gettext ?? createGettext(catalog)

    const basePath =
        config.staticBasePath ??
        window.location.pathname.replace(
            /\/(?:editor\/(?:index\.html)?|index\.html)$/,
            "/"
        )

    ensureResetCSS(basePath)

    initSettings({
        apiUrl: url => url,
        apiUrlMap: {},
        getCsrfToken: () => "",
        gettext: localeGettext,
        interpolate: (fmt, args, named) => {
            if (named) {
                return fmt.replace(/%\(([^)]+)\)s?/g, (_match, key) => {
                    const value = (args as unknown as Record<string, unknown>)[key]
                    return value !== undefined ? String(value) : ""
                })
            }
            let index = 0
            return fmt.replace(/%s/g, () => {
                const value = (args as unknown[])[index++]
                return value !== undefined ? String(value) : ""
            })
        },
        staticUrl: defaultStaticUrl(basePath)
    })

    const username = config.username || "User"
    const user: EditorUser =
        config.user ??
        ({
            id: config.userId ?? 1,
            username,
            emails: [{address: "user@example.com", primary: true}],
            name: username,
            is_authenticated: true
        } as EditorUser)

    let csl = config.csl
    if (!csl) {
        const {createCSL} = await import(
            "@fiduswriter/document/citeproc-plus"
        )
        csl = await createCSL()
        // createCSL replaces getStyle/getLocale with versions that only look at
        // pre-registered styles. Restore the prototype methods so the bundled
        // style/locale chunks are loaded dynamically.
        const cslProto = Object.getPrototypeOf(csl)
        ;(csl as any).getStyle = cslProto.getStyle
        ;(csl as any).getLocale = cslProto.getLocale
    }

    const {createStaticApp} = await import("./static_app.js")

    const app = await createStaticApp({
        ...config,
        locale,
        gettext: localeGettext,
        csl,
        onSaveDocument: config.onSaveDocument
    })

    // Prime the user bibliography and image databases so dialogs that read
    // from them see empty but valid stores.
    await Promise.all([
        (app.bibDB as any).getDB(),
        (app.imageDB as any).getDB()
    ])

    const docInfo = (await config.documentData()).doc_info
    const docId = (docInfo?.id as string | number) ?? 1
    const docPath = (docInfo?.path as string) ?? ""

    const {Editor} = await import("./index.js")

    const plugins: Array<[string, Record<string, unknown>]> =
        config.plugins ?? ([] as Array<[string, Record<string, unknown>]>)

    // In static mode there is no server to confirm a document version, so keep
    // the confirmed document in sync with the current editor state. This ensures
    // exports and printing use the latest edits.
    plugins.push([app.name, {ConfirmedDocEditorPlugin}])

    const editor = new Editor(
        {app, user},
        docPath,
        String(docId),
        plugins
    )

    await editor.init()
    return editor
}
