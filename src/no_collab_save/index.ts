import {addAlert} from "fwtoolkit"
import {receiveTransaction} from "prosemirror-collab"
import {recreateTransform} from "../collab/merge/recreate_transform.js"
import type {Editor} from "../types.js"
import type {Node} from "prosemirror-model"

/**
 * Handles periodic saving and conflict resolution for the editor
 when EDITOR_SAVE_MODE is "direct" (no WebSocket).
 */
export class NoCollabSave {
    editor: Editor
    saveInterval: number | null
    savePromise: Promise<void> | null
    _beforeUnloadHandler: (() => void) | null
    _lastSaveTime: number

    constructor(editor: Editor) {
        this.editor = editor
        this.saveInterval = null
        this.savePromise = null
        this._beforeUnloadHandler = null
        this._lastSaveTime = 0
    }

    start(): void {
        if (this.saveInterval) {
            return
        }
        // Save every 10 seconds when the document is loaded and writable.
        this.saveInterval = window.setInterval(() => {
            if (
                !this.editor.waitingForDocument &&
                !this.savePromise &&
                this.editor.docInfo.access_rights === "write" &&
                this._hasUnsavedChanges()
            ) {
                this.save()
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
                    this._save(true)
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
            return this.savePromise
        }
        this.savePromise = this._save()
        try {
            await this.savePromise
        } finally {
            this.savePromise = null
        }
    }

    _hasUnsavedChanges(): boolean {
        return (this.editor.docInfo.updated as Date).getTime() > this._lastSaveTime
    }

    async _save(keepalive = false): Promise<void> {
        if (this.editor.docInfo.access_rights !== "write") {
            return
        }
        const doc = this.editor.getDoc({use_current_view: true})
        let payload: Record<string, unknown> = {
            id: this.editor.docInfo.id,
            content: doc.content,
            comments: this.editor.mod.comments,
            bibliography: this.editor.mod.db?.bibDB.db,
            title: doc.title,
            version: this.editor.docInfo.version,
            image_updates: this.editor.mod.db?.imageDB.unsentEvents()
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
            const {json, status} = await this.editor.app.apiConnectors.document.saveDocument(
                payload,
                {keepalive}
            )
            if (status === 409) {
                if (!keepalive) {
                    await this._handleVersionConflict()
                }
                return
            }
            const saveData = json as {version?: number}
            if (saveData.version !== undefined) {
                this.editor.docInfo.version = saveData.version
            }
            this.editor.docInfo.updated = new Date()
            this.editor.docInfo.confirmedDoc = this.editor.view.state.doc
            this._lastSaveTime = Date.now()
            // Clear unsent event queues since the full state has been saved.
            if (this.editor.mod.db) {
                this.editor.mod.db.bibDB.unsent = []
                this.editor.mod.db.imageDB.unsent = []
            }
            ;(this.editor.mod.comments as any).store.unsent = []
        } catch (error) {
            if (!keepalive) {
                console.error("Failed to save document:", error)
                addAlert("error", gettext("Could not save document."))
            }
        }
    }

    async _handleVersionConflict(): Promise<void> {
        if (this.editor.docInfo.access_rights !== "write") {
            return
        }
        const payload: Record<string, unknown> = {id: this.editor.docInfo.id}
        if (this.editor.docInfo.token) {
            payload.token = this.editor.docInfo.token
        }
        try {
            const {json} = await this.editor.app.apiConnectors.document.getDocumentData(
                payload as {id: number; token?: string}
            )
            const data = json as {
                doc: Record<string, unknown>
                time: string
            }
            const serverDoc = this.editor.schema.nodeFromJSON(
                (data.doc.content as Record<string, unknown>) || {}
            )
            const currentDoc = this.editor.view.state.doc
            const confirmedDoc = this.editor.docInfo.confirmedDoc as Node

            const remoteTr = recreateTransform(confirmedDoc, serverDoc)
            const localTr = recreateTransform(confirmedDoc, currentDoc)

            const mappedSteps: Array<import("prosemirror-transform").Step> = []
            remoteTr.steps.forEach(step => {
                const mapped = step.map(localTr.mapping)
                if (mapped) {
                    mappedSteps.push(mapped)
                }
            })

            if (mappedSteps.length) {
                this.editor.view.dispatch(
                    receiveTransaction(
                        this.editor.view.state,
                        mappedSteps,
                        mappedSteps.map(() => "remote")
                    ).setMeta("remote", true)
                )
            }

            // Update metadata from server
            ;(this.editor.mod.db?.bibDB as {setDB(value: unknown): void}).setDB(
                data.doc.bibliography
            )
            ;(this.editor.mod.db?.imageDB as {setDB(value: unknown): void}).setDB(
                data.doc.images
            )
            ;(this.editor.mod.comments as any).store.loadComments(
                data.doc.comments
            )
            this.editor.docInfo.version = data.doc.v as number
            this.editor.docInfo.confirmedDoc = this.editor.view.state.doc
            this.editor.docInfo.updated = new Date(data.time)
            ;(this.editor.mod.footnotes as any).fnEditor.renderAllFootnotes()

            // Retry save with the merged document
            await this.save()
        } catch (error) {
            console.error("Failed to handle version conflict:", error)
            addAlert(
                "error",
                gettext(
                    "Document has been modified by another user. Please reload the page."
                )
            )
        }
    }
}
