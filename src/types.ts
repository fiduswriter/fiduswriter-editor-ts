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
import type {App as CommonApp, User} from "@fiduswriter/common"
import type {
    BibDB,
    BibDBEntries,
    CommentData,
    CSL,
    ImageDB,
    ImageDBEntries
} from "@fiduswriter/document"

export type {BibDB, BibDBEntries, CommentData, CSL, ImageDB, ImageDBEntries}
export type {User} from "@fiduswriter/common"

/** Image database interface used by the editor (document and user DBs). */
export interface EditorImageDB extends ImageDB {
    saveImage(imageData: Record<string, unknown>): Promise<number>
    setImage(id: number, imageData: Record<string, unknown>): void
}

/** Extended app object used by the editor page. */
export interface App extends CommonApp {
    isOffline(): boolean
    csl: CSL
    imageDB: EditorImageDB
}

export type {App as EditorApp}

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
            applyDiffs(diffs: unknown[], cid: unknown): void
            schema: {cached: Record<string, unknown>}
        }
        init(): void
        layout?: {updateDOM(): void}
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
    imageEditModel: unknown
    tableMenuModel: unknown
    figureMenuModel: unknown
    toolbarModel: unknown
    toolbarViews?: Array<{update(): void; destroy(): void; onResize?(): void}>
    figureWidthMenuModel: unknown
    codeBlockMenuModel: unknown
    selectionMenuViews?: Array<{destroy(): void}>
}

/** User object attached to the editor, extending the common user with an id. */
export interface EditorUser extends User {
    id: number
    is_authenticated?: boolean
}

/** Constructor options for the Editor class. */
export interface EditorOptions {
    app: App
    user: EditorUser
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
    app: App
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
    statePlugins: EditorPluginTuple[]
    view: EditorView
    currentView: EditorView
    dom: HTMLElement
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
