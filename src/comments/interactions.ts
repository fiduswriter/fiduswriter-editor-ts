import type {Node as ProseMirrorNode} from "prosemirror-model"
import {TextSelection} from "prosemirror-state"
import {GapCursor} from "prosemirror-gapcursor"
import type {EditorView} from "prosemirror-view"

import {findTarget, post} from "fwtoolkit"
import {READ_ONLY_ROLES} from "../index.js"
import type {Editor} from "../types.js"
import {
    deactivateAllSelectedChanges,
    getCommentDuringCreationDecoration
} from "../state_plugins/index.js"
import {
    CommentAnswerEditor,
    CommentEditor,
    serializeComment
} from "./editors/index.js"

interface InteractionsMod {
    editor: Editor
    store: any
    interactions: any
}

export class ModCommentInteractions {
    mod: InteractionsMod
    activeCommentId: string | number | false
    activeCommentAnswerId: string | number | false
    editComment: boolean
    creatingGlobalComment: boolean
    editor: CommentEditor | CommentAnswerEditor | false

    constructor(mod: InteractionsMod) {
        mod.interactions = this
        this.mod = mod
        this.activeCommentId = false
        this.activeCommentAnswerId = false
        this.editComment = false
        this.creatingGlobalComment = false
        this.editor = false
        this.bindEvents()
    }

    bindEvents(): void {
        // Bind all the click events related to comments
        document.body.addEventListener("click", event => {
            const el: {target?: HTMLElement} = {}
            let id: string | number
            switch (true) {
                case findTarget(event, ".edit-comment", el):
                    this.editComment = true
                    this.activeCommentAnswerId = false
                    id = (el.target as HTMLElement).dataset.id as string

                    if (this.activeCommentId !== id) {
                        this.deactivateSelectedChanges()
                        this.activeCommentId = id
                        this.editComment = true
                        this.updateDOM()
                    } else {
                        this.updateDOM()
                    }
                    break
                case findTarget(event, ".edit-comment-answer", el):
                    this.editComment = false
                    this.editAnswer(
                        (el.target as HTMLElement).dataset.id as string,
                        (el.target as HTMLElement).dataset.answer as string
                    )
                    break
                case findTarget(event, ".resolve-comment", el):
                    this.resolveComment(
                        (el.target as HTMLElement).dataset.id as string
                    )
                    break
                case findTarget(event, ".recreate-comment", el):
                    this.recreateComment(
                        (el.target as HTMLElement).dataset.id as string
                    )
                    break
                case findTarget(event, ".assign-comment", el):
                    this.assignComment(
                        (el.target as HTMLElement).dataset.id as string,
                        Number.parseInt(
                            (el.target as HTMLElement).dataset.user as string
                        ),
                        (el.target as HTMLElement).dataset.username as string
                    )
                    break
                case findTarget(event, ".unassign-comment", el):
                    this.unassignComment(
                        (el.target as HTMLElement).dataset.id as string
                    )
                    break
                case findTarget(event, ".fw-delete-comment", el):
                    this.deleteComment(
                        (el.target as HTMLElement).dataset.id as string
                    )
                    break
                case findTarget(event, ".delete-comment-answer", el):
                    this.deleteCommentAnswer(
                        (el.target as HTMLElement).dataset.id as string,
                        (el.target as HTMLElement).dataset.answer as string
                    )
                    break
                default:
                    break
            }
        })
    }

    initEditor(): void {
        const commentEditorDOM = document.querySelector("#comment-editor"),
            answerEditorDOM = document.querySelector("#answer-editor")

        if (
            commentEditorDOM?.matches(":not(:empty)") ||
            answerEditorDOM?.matches(":not(:empty)")
        ) {
            // Editor has been set up already. Abort.
            return
        }

        if (!(commentEditorDOM || answerEditorDOM)) {
            this.editor = false
            return
        }
        const id = this.activeCommentId as string | number
        if (commentEditorDOM) {
            const value =
                    id === "-1"
                        ? {text: [], isMajor: false}
                        : {
                              text: this.mod.store.comments[id].comment,
                              isMajor: this.mod.store.comments[id].isMajor
                          },
                isGlobal =
                    id === "-1"
                        ? this.creatingGlobalComment
                        : this.mod.store.comments[id]?.isGlobal
            this.editor = new CommentEditor(
                this.mod,
                id as string,
                commentEditorDOM as HTMLElement,
                value.text,
                {isMajor: value.isMajor, isGlobal}
            )
        } else {
            const answerId = this.activeCommentAnswerId,
                text = answerId
                    ? this.mod.store.comments[id].answers.find(
                          (answer: any) => answer.id === answerId
                      ).answer
                    : []
            this.editor = new CommentAnswerEditor(
                this.mod,
                id as string,
                answerEditorDOM as HTMLElement,
                 text,
                {answerId: answerId ? String(answerId) : undefined}
            )
        }

        this.editor.init()
    }

    updateDOM(): void {
        ;(this.mod.editor.mod as any).marginboxes.updateDOM()
        this.initEditor()
    }

    findCommentIds(node: ProseMirrorNode): (string | number)[] {
        return node.marks
            .filter(mark => mark.type.name === "comment" && mark.attrs.id)
            .map(mark => mark.attrs.id)
    }

    findCommentsAt(node: ProseMirrorNode): (any | false)[] {
        return this.findCommentIds(node).map(id =>
            this.mod.store.findComment(id)
        )
    }

    deactivateSelectedChanges(): void {
        const tr = deactivateAllSelectedChanges(this.mod.editor.view.state.tr)
        if (tr) {
            this.mod.editor.view.dispatch(tr)
        }
        const fnTr = deactivateAllSelectedChanges(
            (this.mod.editor.mod as any).footnotes.fnEditor.view.state.tr
        )
        if (fnTr) {
            ;(this.mod.editor.mod as any).footnotes.fnEditor.view.dispatch(fnTr)
        }
    }

    collapseSelectionToEnd(): void {
        const $pos = this.mod.editor.currentView.state.selection.$to
        const validTextSelection = $pos.parent.inlineContent
        const selection = validTextSelection
            ? new TextSelection($pos)
            : new GapCursor($pos)
        const tr = this.mod.editor.currentView.state.tr.setSelection(selection)
        if (tr) {
            this.mod.editor.currentView.dispatch(tr)
        }
    }

    activateComment(id: string | number): void {
        this.deactivateAll()
        this.activeCommentId = id
        this.updateDOM()
    }

    deactivateAll(): void {
        this.activeCommentId = false
        this.editComment = false
        this.activeCommentAnswerId = false
        this.creatingGlobalComment = false
        // If there is a comment currently under creation, remove it.
        this.mod.store.removeCommentDuringCreation()
    }

    // Activate the comments included in the selection or the comment where the
    // caret is placed, if the editor is in focus.
    activateSelectedComment(view: EditorView): void {
        const selection = view.state.selection
        let comments: (any | false)[] = []

        if (selection.empty) {
            const node = view.state.doc.nodeAt(selection.from)
            if (node) {
                comments = this.findCommentsAt(node)
            }
        } else {
            view.state.doc.nodesBetween(
                selection.from,
                selection.to,
                (node: ProseMirrorNode) => {
                    if (!node.isInline) {
                        return
                    }
                    comments = comments.concat(this.findCommentsAt(node))
                }
            )
        }

        if (comments.length) {
            if (this.activeCommentId !== comments[0].id) {
                this.activateComment(comments[0].id)
            }
        } else {
            this.deactivateAll()
            this.updateDOM()
        }
    }

    isCurrentlyEditing(): boolean {
        // Returns true if
        // A) a comment form is currently open
        // B) the comment answer edit form is currently open
        // C) part of a new answer has been written
        // D) the focus is currently in new answer text area of a comment
        // E) The comment options are open
        // F) a new comment form is about to be displayed, but the updateDOM
        // call has not yet been made.
        if (!this.activeCommentId) {
            return false
        }
        if (document.querySelector(".submit-comment-answer-edit")) {
            // a comment answer edit form is currently open
            return true
        }
        if (this.editor && this.editor.view && this.editor.view.hasFocus()) {
            // There is currently focus in the comment (answer) form
            return true
        }
        if (this.editor && this.editor.hasChanged?.()) {
            // Part of a comment (answer) has been entered/changed.
            return true
        }
        if (document.querySelector("div.fw-marginbox-options.fw-open")) {
            // A margin box options menu is open.
            return true
        }
        if (
            this.mod.store.commentDuringCreation &&
            this.mod.store.commentDuringCreation.inDOM === false
        ) {
            // A new comment is about to be created, but it has not
            // yet been added to the DOM.
            return true
        }
        return false
    }

    // Create a temporary empty comment for the current user that is not shared
    // with collaborators.
    createNewComment(): void {
        // Unhide comments if they had been hidden.
        ;(this.mod.editor.mod as any).marginboxes.filterOptions.comments = true
        this.deactivateAll()
        this.mod.store.addCommentDuringCreation(this.mod.editor.currentView)
        this.activeCommentId = "-1"
        this.editComment = true
        this.updateDOM()
        if (this.editor) {
            this.editor.view.focus()
        }
    }

    // Create a temporary empty global comment for the entire document.
    createNewGlobalComment(): void {
        if (
            READ_ONLY_ROLES.includes(
                this.mod.editor.docInfo.access_rights as string
            )
        ) {
            return
        }
        ;(this.mod.editor.mod as any).marginboxes.filterOptions.comments = true
        this.deactivateAll()
        this.creatingGlobalComment = true
        this.mod.store.addGlobalCommentDuringCreation()
        this.activeCommentId = "-1"
        this.editComment = true
        this.updateDOM()
        if (this.editor) {
            this.editor.view.focus()
        }
    }

    deleteComment(id: string | number): void {
        if (id === "-1") {
            this.deactivateAll()
        } else {
            // Handle the deletion of a comment.
            this.mod.store.deleteComment(id, true)
        }
        this.updateDOM()
    }

    resolveComment(id: string | number): void {
        this.mod.store.updateComment({id, resolved: true})
    }

    recreateComment(id: string | number): void {
        if (this.editor) {
            this.editor.dom.childNodes.forEach((node: ChildNode) => {
                const el = node as HTMLElement
                if (el.classList?.contains("comment-btns")) {
                    el.childNodes.forEach(buttons => {
                        const buttonEl = buttons as HTMLElement
                        if (
                            buttonEl.classList?.contains("submit") &&
                            buttonEl.classList?.contains("fw-disabled")
                        ) {
                            buttonEl.classList.remove("fw-disabled")
                        }
                    })
                }
            })
        }
        this.mod.store.updateComment({id, resolved: false})
    }

    assignComment(
        id: string | number,
        user: number,
        username: string
    ): void {
        this.notifyAssignedUser(user, id)
        this.mod.store.updateComment({
            id,
            assignedUser: user,
            assignedUsername: username
        })
    }

    unassignComment(id: string | number): void {
        this.mod.store.updateComment({
            id,
            assignedUser: false,
            assignedUsername: false
        })
    }

    notifyAssignedUser(user: number, id: string | number): void {
        const comment = this.mod.store.findComment(id)
        const {html, text} = serializeComment(comment.comment)

        post("/api/document/comment_notify/", {
            doc_id: this.mod.editor.docInfo.id,
            collaborator_id: user,
            comment_html: html,
            comment_text: text,
            type: "assign"
        })
    }

    updateComment({
        id,
        comment,
        isMajor
    }: {
        id: string | number
        comment: any[]
        isMajor: boolean
    }): string | number {
        // Save the change to a comment and mark that the document has been changed
        let commentId: string | number = id
        if (id === "-1") {
            let username: string

            if (
                ["review", "review-tracked"].includes(
                    this.mod.editor.docInfo.access_rights as string
                )
            ) {
                username = `${gettext("Reviewer")} ${(this.mod.editor.user as any).id}`
            } else {
                username = (this.mod.editor.user as any).username
            }

            if (this.creatingGlobalComment) {
                commentId = this.mod.store.addGlobalComment({
                    user: (this.mod.editor.user as any).id,
                    username,
                    date: Date.now() - this.mod.editor.clientTimeAdjustment,
                    comment,
                    isMajor
                })
            } else {
                const referrer = getCommentDuringCreationDecoration(
                    this.mod.store.commentDuringCreation.view.state
                )
                // This is a new comment. We need to get an ID for it if it has content.

                this.mod.store.addComment(
                    {
                        user: (this.mod.editor.user as any).id,
                        username,
                        date: Date.now() - this.mod.editor.clientTimeAdjustment,
                        comment,
                        isMajor
                    },
                    (referrer as {from: number; to: number}).from,
                    (referrer as {from: number; to: number}).to,
                    this.mod.store.commentDuringCreation.view
                )
            }
        } else {
            this.mod.store.updateComment({id, comment, isMajor})
            commentId = id
        }
        this.deactivateAll()
        this.updateDOM()
        return commentId
    }

    cancelSubmit(): void {
        // Handle a click on the cancel button of the comment submit form.
        const id = this.activeCommentId as string | number
        if (id === "-1" || this.mod.store.comments[id]?.comment.length === 0) {
            this.deleteComment(id)
        } else {
            this.deactivateAll()
        }
        this.updateDOM()
    }

    deleteCommentAnswer(id: string | number, answerId: string | number): void {
        // Handle the deletion of a comment answer.
        this.mod.store.deleteAnswer(id, answerId)
        this.deactivateAll()
        this.updateDOM()
    }

    editAnswer(id: string | number, answerId: string | number): void {
        // Mark a specific answer to a comment as active, then layout the
        // comments, which will make that answer editable.
        this.activeCommentId = id
        this.activeCommentAnswerId = answerId
        this.updateDOM()
    }

    createNewAnswer(id: string | number, answerText: string): void {
        // Create a new answer to add to the comment store

        let username: string

        if (
            ["review", "review-tracked"].includes(
                this.mod.editor.docInfo.access_rights as string
            )
        ) {
            username = `${gettext("Reviewer")} ${(this.mod.editor.user as any).id}`
        } else {
            username = (this.mod.editor.user as any).username
        }

        const answer = {
            answer: answerText,
            user: (this.mod.editor.user as any).id,
            username,
            date: Date.now() - this.mod.editor.clientTimeAdjustment
        }

        this.mod.store.addAnswer(id, answer)

        this.deactivateAll()
        this.updateDOM()
        this.activateComment(id)
    }

    submitAnswerUpdate(
        id: string | number,
        answerId: string | number,
        commentText: string
    ): void {
        this.mod.store.updateAnswer(id, answerId, commentText)
        this.deactivateAll()
        this.updateDOM()
        this.activateComment(id)
    }
}
