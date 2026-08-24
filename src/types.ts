/**
 * Shared types used across the @fiduswriter/editor package.
 *
 * These types describe the public shape of the Editor instance and the
 * auxiliary objects attached to it. They are intentionally permissive for
 * module-specific sub-objects (`mod.*`) while the individual modules are
 * being converted to TypeScript.
 */

import type {Node, Schema} from "prosemirror-model"
import type {Plugin, Transaction} from "prosemirror-state"
import type {EditorView} from "prosemirror-view"
// @fiduswriter/frontend types have been inlined — no runtime dependency
import type {
    BibDB,
    BibDBEntries,
    BibDBEntry,
    CommentData,
    CSL,
    ImageDB,
    ImageDBEntries
} from "@fiduswriter/document"
import type {ImageApi} from "@fiduswriter/image-manager"

export type {BibDB, BibDBEntries, BibDBEntry, CommentData, CSL, ImageDB, ImageDBEntries}

/** Image database interface used by the editor (document and user DBs). */
export interface EditorImageDB extends ImageDB {
    saveImage(imageData: Record<string, unknown>): Promise<number>
    setImage(id: number, imageData: Record<string, unknown>): void
}

/** Bibliography database interface used by the editor. */
export interface EditorBibDB {
    db: Record<string, BibDBEntry>
}

/** API connector for document-level operations used by the editor. */
export interface EditorDocumentApi {
    createDocument(
        data: Record<string, unknown>
    ): Promise<{json: unknown; status: number}>
    getWebSocketBase(
        data: {id: number; token?: string}
    ): Promise<{json: unknown; status: number}>
    getDocumentStyles(
        data: {id: number; token?: string}
    ): Promise<{json: unknown; status: number}>
    getDocumentData(
        data: {id: number; token?: string; v?: number}
    ): Promise<{json: unknown; status: number}>
    saveDocument(
        data: Record<string, unknown>,
        options?: {keepalive?: boolean}
    ): Promise<{json: unknown; status: number}>
    commentNotify(data: Record<string, unknown>): Promise<unknown>
    requestAccess(
        data: {document_id: number; rights: string}
    ): Promise<{json: unknown; status: number}>
    validateShareToken(
        token: string
    ): Promise<{json: unknown; status: number}>
    listShareTokens(document_id: number): Promise<{json: unknown; status: number}>
    createShareToken(
        data: Record<string, unknown>
    ): Promise<{json: unknown; status: number}>
    revokeShareToken(token_id: number): Promise<{json: unknown; status: number}>
    getAccessRights(
        data: {document_ids: number[]}
    ): Promise<{json: unknown; status: number}>
    saveAccessRights(data: {
        document_ids: number[]
        access_rights: unknown[]
    }): Promise<unknown>
    saveE2EEImage(
        data: Record<string, unknown>,
        files?: Record<string, unknown>
    ): Promise<{json: unknown; status: number}>
    deleteE2EEImage(data: {doc_id: number; image_id: number}): Promise<unknown>
    uploadRevision(
        data: {note: string; document_id: number},
        files: Record<string, unknown>
    ): Promise<unknown>
    getTemplateForDoc(
        id: number | string,
        token: string | false
    ): Promise<{json: unknown; status: number}>
}

/** API connector for contact operations used by the editor. */
export interface EditorContactsApi {
    add(data: {user_string: string}): Promise<{json: unknown; status: number}>
}

/** API connector for document import/copy operations used by the editor. */
export interface EditorDocumentImportApi {
    createDoc(
        data: Record<string, unknown>,
        files?: Record<string, unknown>
    ): Promise<{json: unknown; status: number}>
    saveImage(
        data: Record<string, unknown>,
        files: Record<string, unknown>
    ): Promise<{json: unknown; status: number}>
    saveE2EEImage(
        data: Record<string, unknown>,
        files: Record<string, unknown>
    ): Promise<{json: unknown; status: number}>
    saveDocument(
        data: Record<string, unknown>
    ): Promise<{json: unknown; status: number}>
}

/** Minimal app interface — only the fields the Editor actually uses. */
export interface EditorApp {
    routes: Record<string, {app: string; [key: string]: unknown}>
    goTo: (url: string) => void
    settings: {APPS: string[]; [key: string]: unknown}
    menuPlugins?: Array<[string, Record<string, {new (...args: unknown[]): {init(): void}}>]>
    name: string
    isOffline(): boolean
    csl: CSL
    bibDB?: EditorBibDB
    imageDB: EditorImageDB
    config?: {
        user?: {
            preferences?: Record<string, boolean>
        }
    }
    apiConnectors: {
        document: EditorDocumentApi
        documentImport: EditorDocumentImportApi
        image: ImageApi
        contacts: EditorContactsApi
    }
}

/** Document access role constants. */
export type CommentOnlyRole = "review" | "comment"
export type ReadOnlyRole = "read" | "read-without-comments"
export type ReviewRole = "review" | "review-tracked"
export type WriteRole = "write" | "write-tracked" | "review-tracked"
export type AccessRole =
    | "write"
    | "write-tracked"
    | "review"
    | "review-tracked"
    | "comment"
    | "read"
    | "read-without-comments"

export const COMMENT_ONLY_ROLES: CommentOnlyRole[] = ["review", "comment"]
export const READ_ONLY_ROLES: ReadOnlyRole[] = ["read", "read-without-comments"]
export const REVIEW_ROLES: ReviewRole[] = ["review", "review-tracked"]
export const WRITE_ROLES: WriteRole[] = [
    "write",
    "write-tracked",
    "review-tracked"
]

/** Information about the currently edited document. */
export interface DocInfo {
    id: number | string
    token?: string
    session_id?: string
    templateId?: number
    rights: string
    owner?: {
        id: number
        name?: string
        type?: string
        avatar?: string
        contacts: Array<{id: number | string; type: string; name: string; avatar?: string}>
    }
    is_owner: boolean
    confirmedDoc: Node | false
    updated: Date | false
    dir: "ltr" | "rtl"
    path: string
    access_rights?: AccessRole
    wsBase?: string
    version?: number
    e2ee?: boolean
}

/** Aggregated editor module namespace (populated by individual modules). */
export interface EditorMod {
    [key: string]: unknown
    collab?: {
        doc: {
            sendToCollaborators(): void
            confirmVersion(n: number): void
            receiveDiff(data: unknown): void
            receiveSelectionChange(data: unknown): void
            checkVersion(offline?: boolean): void
            cancelCurrentlyCheckingVersion(): void
            confirmDiff(rid: number): void
            rejectDiff(rid: number): void
            awaitingDiffResponse: boolean
            footnoteRender: boolean
        }
        participants: Array<{id: number; name?: string; session_id?: string; sessionIds?: string[]}>
        pastParticipants: Array<{id: number; name?: string}>
        updateParticipantList(participants: unknown[]): void
        colors: {
            ensureUserColor(id: number): void
        }
        chat: {
            newMessage(message: unknown): void
            showChat(participants: unknown[]): void
        }
    }
    marginboxes?: {
        updateDOM(): void
        view(view: EditorView): void
        init(): void
        marginBoxes: Array<{view?: string; type?: string; pos?: number}>
    }
    footnotes?: {
        fnEditor: {
            view: EditorView
            renderAllFootnotes(): void
            renderFootnote(content: unknown, index: number, tr: Transaction): void
            removeFootnote(index: number, tr: Transaction): void
            applyDiffs(diffs: unknown[], cid: unknown): void
            schema: {cached: Record<string, unknown>}
        }
        init(): void
        layout: {updateDOM(): void}
    }
    comments?: {
        store: {
            reset(): void
            loadComments(comments: unknown): void
            unsentEvents(): unknown[]
            eventsSent(events: unknown[]): void
            receive(events: unknown[]): void
            comments: Record<string, unknown>
        }
        interactions: {
            createNewComment(): void
            isCurrentlyEditing(): boolean
            deactivateAll(): void
            deactivateSelectedChanges(): void
        }
    }
    documentTemplate?: {
        documentStyles: Array<{slug: string}>
        getCitationStyles(): Promise<unknown>
        setStyles(styles: unknown): void
        addDocPartSettings(): void
        addCitationStylesMenuEntries(): void
    }
    citations?: {
        init(): void
        resetCitations(): void
        layoutCitations(): void
    }
    navigator?: {
        init(): void
    }
    track?: unknown
    db?: {
        bibDB: {
            db: BibDBEntries
            unsent: unknown[]
            setDB(value: BibDB): void
            unsentEvents(): unknown[]
            eventsSent(events: unknown[]): void
            receive(events: unknown[]): void
            hasReference(ref: unknown): boolean
            addReference(ref: unknown, id: number): number
        }
        imageDB: {
            db: ImageDBEntries
            unsent: unknown[]
            setDB(value: ImageDB): void
            unsentEvents(): unknown[]
            eventsSent(events: unknown[]): void
            receive(events: unknown[]): void
        }
        clean?(): void
    }
}

/** End-to-end encryption state attached to an editor. */
export interface EditorE2EE {
    key?: CryptoKey
    snapshotManager?: {
        setKey(key: CryptoKey): void
        sendInitialSnapshot(...args: unknown[]): void
        handleRequestSnapshot(data: unknown): void
        handleSnapshotReceived(data: unknown): void
        getEncryptedSnapshot(): Promise<any | null>
        reEncryptWithNewKey(
            newKey: CryptoKey,
            newSaltBase64: string,
            newIterations: number
        ): Promise<void>
    }
    encrypted?: boolean
    encryptionSalt?: string
    encryptionIterations?: number
    password?: string
    usesPassphrase?: boolean
}

/** Menu model registry created during editor construction. */
export interface EditorMenu {
    headerbarModel: unknown
    headerView?: {update(): void; destroy(): void}
    imageMenuModel: unknown
    navigatorFilterModel: unknown
    orderedListMenuModel: unknown
    selectionMenuModel: unknown
    tableMenuModel: unknown
    figureMenuModel: unknown
    toolbarModel: unknown
    toolbarViews?: Array<{update(): void; destroy(): void; onResize?(): void}>
    figureWidthMenuModel: unknown
    codeBlockMenuModel: unknown
    selectionMenuViews?: Array<{destroy(): void}>
}

/** User object attached to the editor. */
export interface EditorUser {
    id: number
    username: string
    emails: Array<{address: string; primary?: boolean}>
    name?: string
    avatar?: string
    is_authenticated?: boolean
}

/** Constructor options for the Editor class. */
export interface EditorOptions {
    app: EditorApp
    user: EditorUser
    /**
     * Optional container element to mount the editor into. When omitted, the
     * editor replaces `document.body` (full-page mode).
     */
    mount?: HTMLElement
}

/** Editor plugin tuple used to build the ProseMirror state. */
export type EditorPluginTuple =
    | [Plugin | ((...args: unknown[]) => Plugin)]
    | [
          Plugin | ((...args: unknown[]) => Plugin),
          () => Record<string, unknown>
      ]

/** Main Editor instance shape used by modules, state plugins and menus. */
export interface Editor {
    app: EditorApp
    user: EditorUser
    editorPlugins: EditorPluginTuple[]
    citationDialogPlugins: EditorPluginTuple[] | null
    mod: EditorMod
    waitingForDocument: boolean
    docInfo: DocInfo
    schema: Schema & {cached: Record<string, unknown>}
    menu: EditorMenu
    client_id: number
    clientTimeAdjustment: number
    e2ee: EditorE2EE | null
    pathEditable: boolean
    /** Optional callback invoked after the user edited the document title/path in the header. */
    onPathChange?: (path: string) => void
    statePlugins: EditorPluginTuple[]
    view: EditorView
    currentView: EditorView
    dom: HTMLElement
    mount?: HTMLElement
    ws?: {
        connectionCount?: number
        online?: boolean
        connected?: boolean
        ws?: WebSocket
        init(): void
        close(): void
        send(data: string | (() => Record<string, unknown> | false | undefined)): void
    }

    init(): Promise<void>
    startWebSocket(): void
    getDoc(options?: {use_current_view?: boolean; changes?: string}): Record<string, unknown>
    close(): void
    scrollPosIntoView(pos: number, view: EditorView): void
    scrollBibliographyIntoView(_target?: string): void
    scrollIdIntoView(id: string): void
}

/** State plugin context object passed to most plugin constructors. */
export interface EditorPluginContext {
    editor: Editor
    viewType?: string
}

/** Helper type for transaction inputType metadata. */
export type InputType =
    | "deleteContentBackward"
    | "deleteContentForward"
    | "historyUndo"
    | "historyRedo"
    | "insertText"
    | "insertFromPaste"
    | string

export interface TransactionWithInputType extends Transaction {
    setMeta(key: "inputType", value: InputType): this
}
