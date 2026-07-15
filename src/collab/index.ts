import type {EditorView} from "prosemirror-view"

import {removeCollaboratorSelection} from "../state_plugins/collab_carets.js"
import type {Editor} from "../types.js"

import {ModCollabChat} from "./chat.js"
import {ModCollabColors} from "./colors.js"
import {ModCollabDoc} from "./doc.js"

interface Participant {
    id: number
    session_id?: string
    sessionIds?: string[]
}

export class ModCollab {
    editor: Editor
    participants: Participant[]
    pastParticipants: Participant[]
    sessionIds: string[] | false
    collaborativeMode: boolean
    colors!: ModCollabColors
    chat!: ModCollabChat
    doc!: ModCollabDoc

    constructor(editor: Editor) {
        editor.mod.collab = this
        this.editor = editor
        this.participants = []
        this.pastParticipants = [] // Participants who have left comments or tracked changes.
        this.sessionIds = false
        this.collaborativeMode = false

        new ModCollabDoc(this)
        new ModCollabChat(this)
        new ModCollabColors(this)
    }

    updateParticipantList(participantArray: Participant[]): void {
        const allSessionIds: string[] = [],
            participantObj: Record<number, Participant> = {}

        participantArray.forEach(participant => {
            const entry = participantObj[participant.id]
            allSessionIds.push(participant.session_id as string)
            if (entry) {
                entry.sessionIds?.push(participant.session_id as string)
            } else {
                participant.sessionIds = [participant.session_id as string]
                delete participant.session_id
                participantObj[participant.id] = participant
            }
        })

        this.participants = Object.values(participantObj)
        if (!this.sessionIds) {
            if (allSessionIds.length === 1) {
                // We just connected to the editor and we are the only connected
                // party. This is a good time to clean up the databases, removing
                // unused images and bibliography items.
                if (this.editor.mod.db) {
                    (
                        this.editor.mod.db as unknown as {clean: () => void}
                    ).clean()
                }
            }
            this.sessionIds = []
        }
        // Check if each of the old session IDs is still present in last update.
        // If not, remove the corresponding carets if any.
        this.sessionIds.forEach(session_id => {
            if (!allSessionIds.includes(session_id)) {
                const tr = removeCollaboratorSelection(this.editor.view.state, {
                    session_id
                })
                const fnTr = removeCollaboratorSelection(
                    (
                        this.editor.mod.footnotes as {
                            fnEditor: {view: EditorView}
                        }
                    ).fnEditor.view.state,
                    {session_id}
                )
                if (tr) {
                    this.editor.view.dispatch(tr)
                }
                if (fnTr) {
                    ;(
                        this.editor.mod.footnotes as {
                            fnEditor: {view: EditorView}
                        }
                    ).fnEditor.view.dispatch(fnTr)
                }
            }
        })
        this.sessionIds = allSessionIds
        if (participantArray.length > 1) {
            this.collaborativeMode = true
        } else if (participantArray.length === 1) {
            this.collaborativeMode = false
        }
        this.participants.forEach(participant => {
            this.colors.ensureUserColor(participant.id)
        })
        if (
            (this.editor.menu as unknown as {headerView?: {update: () => void}})
                .headerView
        ) {
            ;(
                this.editor.menu as unknown as {headerView: {update: () => void}}
            ).headerView.update()
        }
        this.chat.showChat(participantArray)
    }
}
