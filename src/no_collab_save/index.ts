import {addAlert} from "fwtoolkit"
import {sendableSteps} from "prosemirror-collab"
import type {Node} from "prosemirror-model"
import type {Step} from "prosemirror-transform"

import type {Editor} from "../types.js"
import {
    createConfirmTransaction,
    createRemoteTransaction,
    getRemoteSteps,
    type CoveringMessage
} from "./merge.js"

/** Result of a save attempt. */
export type SaveStatus = "saved" | "conflict" | "skipped" | "error"

/** Document data as returned by the document data connector. */
interface ServerDocData {
    doc?: {
        v?: number
        content?: Record<string, unknown>
        comments?: Record<string, unknown>
        bibliography?: Record<string, unknown>
        images?: Record<string, unknown>
    }
    /** Covering steps, if the backend keeps track of them. */
    m?: CoveringMessage[]
    time?: string | number
}

/**
 * Handles periodic saving and conflict resolution for the editor
 * when EDITOR_SAVE_MODE is "direct" (no WebSocket).
 *
 * Two mechanisms keep multiple editors of the same document in sync:
 *
 * - Saving sends the full document together with the version it is based on.
 *   When the server rejects it because another editor saved in the meantime
 *   (HTTP 409), the steps that the other editor made are reconstructed from
 *   the saved base to the server document (server-provided covering steps
 *   when available, otherwise with `recreateTransform`) and the unconfirmed
 *   local steps are rebased on top of them, then the save is retried.
 * - Even without local changes, the editor periodically checks the server
 *   for changes and merges them in, so that two editors do not diverge
 *   while typing.
 */
export class NoCollabSave {
    editor: Editor
    saveInterval: number | null
    savePromise: Promise<SaveStatus> | null
    _beforeUnloadHandler: (() => void) | null
    _lastSaveTime: number
    /**
     * The document state as last confirmed by the server (at load or after
     * a successful save or merge). Together with the collab plugin's
     * unconfirmed queue it defines the base of the three-way rebase:
     * the unconfirmed queue contains exactly the local steps made since
     * this document state.
     *
     * `docInfo.confirmedDoc` cannot be used for this: in static deployments
     * a plugin keeps it equal to the live document, which would make the
     * local side of the merge empty.
     */
    _savedBaseDoc: Node | null

    constructor(editor: Editor) {
        this.editor = editor
        this.saveInterval = null
        this.savePromise = null
        this._beforeUnloadHandler = null
        this._lastSaveTime = 0
        this._savedBaseDoc = null
    }

    start(): void {
        if (this.saveInterval) {
            return
        }
        this._savedBaseDoc = this.editor.view.state.doc
        this._lastSaveTime = Date.now()
        // Every 10 seconds: save when there are unsaved changes, otherwise
        // check for changes made by other editors/users on the server.
        this.saveInterval = window.setInterval(() => {
            if (
                !this.editor.waitingForDocument &&
                !this.savePromise &&
                this.editor.docInfo.access_rights === "write"
            ) {
                if (this._hasUnsavedChanges()) {
                    void this.save()
                } else {
                    void this.checkForRemoteChanges()
                }
            }
        }, 10000)

        // For non-E2EE documents, try to save on tab close / page hide.
        // E2EE encryption is async and cannot run reliably in unload handlers.
        if (!this.editor.e2ee?.encrypted) {
            this._beforeUnloadHandler = () => {
                if (
                    this.editor.docInfo.access_rights === "write" &&
                    this._hasUnsavedChanges()
                ) {
                    void this._save(true)
                }
            }
            window.addEventListener("beforeunload", this._beforeUnloadHandler)
            window.addEventListener("pagehide", this._beforeUnloadHandler)
        }
    }

    stop(): void {
        if (this.saveInterval) {
            window.clearInterval(this.saveInterval)
            this.saveInterval = null
        }
        if (this._beforeUnloadHandler) {
            window.removeEventListener(
                "beforeunload",
                this._beforeUnloadHandler
            )
            window.removeEventListener("pagehide", this._beforeUnloadHandler)
            this._beforeUnloadHandler = null
        }
    }

    async save(): Promise<void> {
        if (this.savePromise) {
            return this.savePromise.then(() => undefined)
        }
        this.savePromise = this._save()
        try {
            await this.savePromise
        } finally {
            this.savePromise = null
        }
    }

    /**
     * Whether there are local changes that have not been confirmed by the
     * server: unconfirmed document steps, unsent comment/bibliography/image
     * events, or (as a fallback) a document that differs from the last
     * server-confirmed state.
     */
    _hasUnsavedChanges(): boolean {
        if (sendableSteps(this.editor.view.state)) {
            return true
        }
        const store = (this.editor.mod.comments as any)?.store
        if (store?.unsentEvents?.().length) {
            return true
        }
        const db = this.editor.mod.db
        if (
            db?.bibDB?.unsentEvents?.().length ||
            db?.imageDB?.unsentEvents?.().length
        ) {
            return true
        }
        return Boolean(
            this._savedBaseDoc &&
                !this.editor.view.state.doc.eq(this._savedBaseDoc)
        )
    }

    async _save(keepalive = false, fromMerge = false): Promise<SaveStatus> {
        if (this.editor.docInfo.access_rights !== "write") {
            return "skipped"
        }
        // Snapshot the state and the event queues *before* any await: only
        // what is sent in this request may be marked as saved afterwards.
        const savedDoc = this.editor.view.state.doc
        const sentSteps: readonly Step[] =
            sendableSteps(this.editor.view.state)?.steps ?? []
        const store = (this.editor.mod.comments as any)?.store
        const db = this.editor.mod.db
        const sentComments = store?.unsentEvents?.() ?? []
        const sentBib = db?.bibDB?.unsentEvents?.() ?? []
        const sentImages = db?.imageDB?.unsentEvents?.() ?? []
        const doc = this.editor.getDoc({use_current_view: true})
        let payload: Record<string, unknown> = {
            id: this.editor.docInfo.id,
            content: doc.content,
            // Send the plain comments data, not the ModComments instance —
            // serializing the instance hits a circular structure (editor ->
            // app -> bibDB -> app) and breaks JSON.stringify.
            comments: store?.comments,
            bibliography: db?.bibDB?.db || {},
            images: db?.imageDB?.db || {},
            title: doc.title,
            version: this.editor.docInfo.version,
            steps: sentSteps.map(step => step.toJSON()),
            client_id: this.editor.client_id,
            image_updates: sentImages
        }

        if (
            this.editor.e2ee &&
            this.editor.e2ee.encrypted &&
            this.editor.e2ee.snapshotManager
        ) {
            const snapshot =
                await (this.editor.e2ee.snapshotManager as {
                    getEncryptedSnapshot: () => Promise<Record<string, unknown>>
                }).getEncryptedSnapshot()
            if (snapshot) {
                payload = {
                    id: this.editor.docInfo.id,
                    content: snapshot.content,
                    comments: snapshot.comments,
                    bibliography: snapshot.bibliography,
                    title: snapshot.title,
                    version: snapshot.v,
                    e2ee_salt: snapshot.e2ee_salt,
                    e2ee_iterations: snapshot.e2ee_iterations,
                    e2ee_snapshot_version: snapshot.v
                }
            }
        }

        try {
            const {json, status} =
                await this.editor.app.apiConnectors.document.saveDocument(
                    payload,
                    {keepalive}
                )
            if (status === 409) {
                if (keepalive || fromMerge) {
                    // The caller decides whether to merge again. In the
                    // keepalive case there is no time left to merge.
                    return "conflict"
                }
                await this._handleVersionConflict()
                return "conflict"
            }
            const saveData = json as {version?: number}
            if (saveData.version !== undefined) {
                this.editor.docInfo.version = saveData.version
            }
            this.editor.docInfo.updated = new Date()
            this.editor.docInfo.confirmedDoc = savedDoc
            this._savedBaseDoc = savedDoc
            this._lastSaveTime = Date.now()
            // Confirm exactly the steps that were part of this save; steps
            // made while the request was in flight stay unconfirmed.
            const confirmTr = createConfirmTransaction(
                this.editor.view.state,
                sentSteps,
                this.editor.client_id
            )
            if (confirmTr) {
                this.editor.view.dispatch(confirmTr)
            }
            // Drop exactly the event queues that were part of this save.
            store?.eventsSent?.(sentComments)
            db?.bibDB?.eventsSent?.(sentBib)
            db?.imageDB?.eventsSent?.(sentImages)
            return "saved"
        } catch (error) {
            if (!keepalive) {
                console.error("Failed to save document:", error)
                if (error instanceof Error && error.name === "LockError") {
                    addAlert(
                        "error",
                        gettext(
                            "The file is locked by another session. Changes cannot be saved until the lock is released."
                        )
                    )
                } else {
                    addAlert("error", gettext("Could not save document."))
                }
            }
            return "error"
        }
    }

    /**
     * Periodically fetch the server state and merge in changes made by other
     * editors, even when there are no local changes. Only a cheap version
     * probe is used when the host provides one; the full document is only
     * fetched when the version changed (or when no version information is
     * available).
     */
    async checkForRemoteChanges(): Promise<void> {
        if (
            this.editor.docInfo.access_rights !== "write" ||
            this.editor.waitingForDocument ||
            this.savePromise ||
            this.editor.e2ee?.encrypted
        ) {
            return
        }
        const documentApi = this.editor.app.apiConnectors.document
        const id = this.editor.docInfo.id
        const token = this.editor.docInfo.token
        const baseAtStart = this._savedBaseDoc
        try {
            if (documentApi.getDocumentVersion) {
                const {json} = await documentApi.getDocumentVersion({
                    id,
                    token
                })
                const version = (json as {version?: number})?.version
                if (
                    typeof version === "number" &&
                    version === this.editor.docInfo.version
                ) {
                    return
                }
            }
            const {json} = await documentApi.getDocumentData({
                id,
                token,
                v: this.editor.docInfo.version
            })
            if (this._savedBaseDoc !== baseAtStart || this.savePromise) {
                // A save or merge completed while we were fetching. The next
                // tick will check again.
                return
            }
            if (
                !documentApi.getDocumentVersion &&
                this.editor.schema
                    .nodeFromJSON(
                        (json as ServerDocData).doc?.content || {}
                    )
                    .eq(this.editor.view.state.doc)
            ) {
                // Without a version probe, only merge when the document
                // actually differs (data is fetched in-memory for such hosts).
                return
            }
            this._mergeServerData(json as ServerDocData)
        } catch (error) {
            // Network errors are expected (e.g. briefly offline); the next
            // interval tick will try again.
            console.warn("Could not check for remote document changes:", error)
        }
    }

    /**
     * Fetch the server state after a rejected save, merge the third-party
     * changes into the local document, and retry the save on top of the new
     * server version. Retries a few times in case another editor saves while
     * we are merging; alerts and leaves the unsaved local changes in place if
     * the conflict persists.
     */
    async _handleVersionConflict(): Promise<void> {
        if (this.editor.docInfo.access_rights !== "write") {
            return
        }
        if (this.editor.e2ee?.encrypted) {
            // Encrypted documents cannot be merged without decrypting the
            // server state; keep the current behavior of asking for a reload.
            addAlert(
                "error",
                gettext(
                    "Document has been modified by another user. Please reload the page."
                )
            )
            return
        }
        const documentApi = this.editor.app.apiConnectors.document
        const id = this.editor.docInfo.id
        const token = this.editor.docInfo.token
        for (let attempt = 0; attempt < 3; attempt++) {
            const baseAtStart = this._savedBaseDoc
            try {
                const {json} = await documentApi.getDocumentData({
                    id,
                    token,
                    v: this.editor.docInfo.version
                })
                if (this._savedBaseDoc !== baseAtStart) {
                    // Another save/merge completed while fetching; re-check
                    // against the new base.
                    continue
                }
                const data = json as ServerDocData
                const serverDoc = this.editor.schema.nodeFromJSON(
                    data.doc?.content || {}
                )
                const hadLocalChanges = !serverDoc.eq(
                    this.editor.view.state.doc
                )
                this._mergeServerData(data, serverDoc)
                if (!hadLocalChanges) {
                    // The server already has our state; nothing to resend.
                    this._lastSaveTime = Date.now()
                    return
                }
                const status = await this._save(false, true)
                if (status === "saved" || status === "error") {
                    return
                }
            } catch (error) {
                console.error("Failed to handle version conflict:", error)
                addAlert(
                    "error",
                    gettext(
                        "Document has been modified by another user. Please reload the page."
                    )
                )
                return
            }
        }
        addAlert(
            "error",
            gettext(
                "The document is being edited in another session. Your latest changes could not be saved automatically."
            )
        )
    }

    /**
     * Merge the server state into the local document: apply the third-party
     * steps (rebasing local unconfirmed steps on top), then replace the
     * comment/bibliography/image databases while preserving local unsent
     * entries.
     */
    _mergeServerData(data: ServerDocData, serverDoc?: Node): void {
        const schema = this.editor.schema
        const currentDoc = this.editor.view.state.doc
        const server =
            serverDoc || schema.nodeFromJSON(data.doc?.content || {})
        const baseDoc = this._savedBaseDoc || currentDoc
        const {steps, clientIds} = getRemoteSteps(
            schema,
            baseDoc,
            server,
            data.m
        )
        if (steps.length) {
            this.editor.view.dispatch(
                createRemoteTransaction(
                    this.editor.view.state,
                    steps,
                    clientIds
                )
            )
        }

        const db = this.editor.mod.db
        if (db) {
            // Re-apply local unsent entries on top of the server data and
            // keep them queued, so they are still saved/persisted afterwards.
            const bibEvents = db.bibDB.unsentEvents()
            const bibUnsent = db.bibDB.unsent.slice()
            db.bibDB.setDB(
                (data.doc?.bibliography as never) ?? ({} as never)
            )
            db.bibDB.receive(bibEvents)
            db.bibDB.unsent = bibUnsent

            const imageEvents = db.imageDB.unsentEvents()
            const imageUnsent = db.imageDB.unsent.slice()
            db.imageDB.setDB((data.doc?.images as never) ?? ({} as never))
            db.imageDB.receive(imageEvents)
            db.imageDB.unsent = imageUnsent
        }

        const store = (this.editor.mod.comments as any)?.store
        if (store) {
            const commentEvents = store.unsentEvents()
            const commentUnsent = store.unsent.slice()
            store.reset()
            store.loadComments(data.doc?.comments ?? {})
            store.receive(commentEvents)
            store.unsent = commentUnsent
        }

        if (typeof data.doc?.v === "number") {
            this.editor.docInfo.version = data.doc.v
        }
        this._savedBaseDoc = server
        this.editor.docInfo.confirmedDoc = server
        if (data.time !== undefined) {
            this.editor.docInfo.updated = new Date(data.time)
        }
        ;(this.editor.mod.footnotes as any).fnEditor.renderAllFootnotes()
    }
}
