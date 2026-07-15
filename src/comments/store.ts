import type {Node as ProseMirrorNode} from "prosemirror-model"
import type {Transaction} from "prosemirror-state"
import type {EditorView} from "prosemirror-view"
import {randomCommentId} from "@fiduswriter/document/schema/common/index"

import type {Editor} from "../types.js"
import {
    addCommentDuringCreationDecoration,
    removeCommentDuringCreationDecoration
} from "../state_plugins/index.js"
import {Comment} from "./comment.js"

interface StoreMod {
    editor: Editor
    interactions: {
        isCurrentlyEditing(): boolean
        activeCommentId: string | number | boolean
        activateComment(id: string | number): void
    }
    [key: string]: any
}

interface CommentDuringCreation {
    comment: Comment
    inDOM: boolean
    view: EditorView | null
}

interface UnsentEvent {
    type: string
    id?: string | number
    answerId?: string | number
}

export class ModCommentStore {
    mod: StoreMod
    commentDuringCreation: CommentDuringCreation | false
    comments: Record<number | string, Comment>
    unsent: UnsentEvent[]

    constructor(mod: StoreMod) {
        mod.store = this
        this.mod = mod
        // a comment object for a comment that is still under construction
        this.commentDuringCreation = false
        this.comments = {}
        this.unsent = []
    }

    reset(): void {
        this.comments = {}
        this.unsent = []
    }

    findComment(id: number | string): Comment | false {
        if (id in this.comments) {
            return this.comments[id]
        }
        return false
    }

    mustSend(): void {
        // Set a timeout so that the update can be combines with other updates
        // if they happen more or less simultaneously.
        window.setTimeout(
            () =>
                (this.mod.editor.mod as any).collab.doc.sendToCollaborators(),
            100
        )
    }

    // Create a new temporary comment. This one is not going into the store yet,
    // as it is empty, shouldn't be shared and if canceled, it should go away
    // entirely.
    addCommentDuringCreation(view: EditorView): void {
        const state = view.state,
            tr = addCommentDuringCreationDecoration(state, state.tr)

        if (!tr) {
            // adding decoration failed
            return
        }

        view.dispatch(tr)

        let username: string

        if (
            ["review", "review-tracked"].includes(
                this.mod.editor.docInfo.access_rights as string
            )
        ) {
            username = `${gettext("Reviewer")} ${(this.mod.editor.user as any).id}`
        } else {
            username = this.mod.editor.user.username
        }

        this.commentDuringCreation = {
            comment: new Comment({
                id: "-1",
                user: (this.mod.editor.user as any).id,
                username,
                date: Date.now() - this.mod.editor.clientTimeAdjustment,
                isGlobal: true
            }),
            inDOM: false,
            view
        }
    }

    // Create a new temporary global comment. Like addCommentDuringCreation,
    // this is not shared until it has content.
    addGlobalCommentDuringCreation(): void {
        let username: string

        if (
            ["review", "review-tracked"].includes(
                this.mod.editor.docInfo.access_rights as string
            )
        ) {
            username = `${gettext("Reviewer")} ${(this.mod.editor.user as any).id}`
        } else {
            username = this.mod.editor.user.username
        }

        this.commentDuringCreation = {
            comment: new Comment({
                id: "-1",
                user: (this.mod.editor.user as any).id,
                username,
                date: Date.now() - this.mod.editor.clientTimeAdjustment,
                isGlobal: true
            }),
            inDOM: false,
            view: null
        }
    }

    removeCommentDuringCreation(): void {
        if (this.commentDuringCreation) {
            const view = this.commentDuringCreation.view
            this.commentDuringCreation = false
            if (view) {
                const state = view.state
                const tr = removeCommentDuringCreationDecoration(
                    state,
                    state.tr
                )
                if (tr) {
                    view.dispatch(tr)
                }
            }
        }
    }

    // Add a new comment to the comment database both remotely and locally.
    addComment(
        commentData: any,
        posFrom: number,
        posTo: number,
        view: EditorView
    ): void {
        const id = randomCommentId(),
            markType = view.state.schema.marks.comment.create({id}),
            tr = this.addMark(view.state.tr, posFrom, posTo, markType)

        if (tr) {
            commentData.id = id
            commentData.answers = []
            this.addLocalComment(commentData, true)
            this.unsent.push({
                type: "create",
                id
            })
            view.dispatch(tr)
            this.mustSend()
        }
    }

    // Add a new global comment that refers to the entire document.
    addGlobalComment(commentData: any): number | string {
        const id = randomCommentId()
        commentData.id = id
        commentData.answers = []
        commentData.isGlobal = true
        this.addLocalComment(commentData, true)
        this.unsent.push({
            type: "create",
            id
        })
        this.mustSend()
        return id
    }

    // Add marks to leaf nodes and inline nodes.
    addMark(
        tr: Transaction,
        from: number,
        to: number,
        mark: ProseMirrorNode["marks"][0]
    ): Transaction | undefined {
        // add to inline nodes
        tr.addMark(from, to, mark)
        // add to leaf nodes
        tr.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number, parent: ProseMirrorNode | null) => {
            if (!node.isLeaf) {
                return
            }
            const marks = node.marks
            if (
                !mark.isInSet(marks) &&
                parent && parent.type.allowsMarkType(mark.type)
            ) {
                const newMarks = mark.addToSet(marks)
                tr.setNodeMarkup(pos, null, node.attrs, newMarks)
            }
        })
        if (!tr.steps.length) {
            return
        }
        return tr
    }

    removeMark(
        tr: Transaction,
        from: number,
        to: number,
        mark: ProseMirrorNode["marks"][0]
    ): void {
        // remove from inline nodes
        tr.removeMark(from, to, mark)
        // remove from leaf nodes
        tr.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            if (!node.isLeaf) {
                return
            }
            const marks = node.marks
            if (mark.isInSet(marks)) {
                const newMarks = mark.removeFromSet(marks)
                tr.setNodeMarkup(pos, null, node.attrs, newMarks)
            }
        })
    }

    loadComments(commentsData: Record<number | string, any>): void {
        Object.entries(commentsData).forEach(([id, comment]) =>
            this.addLocalComment(Object.assign({id}, comment))
        )
    }

    addLocalComment(commentData: any, local?: boolean): void {
        // Don't add to pastParticipants if user is undefined (e.g. new unsaved comments)
        if (
            commentData.user !== undefined &&
            !(this.mod.editor.mod as any).collab.pastParticipants.find(
                (participant: {id: number}) => participant.id === commentData.user
            )
        ) {
            ;(this.mod.editor.mod as any).collab.pastParticipants.push({
                id: commentData.user,
                name: commentData.username
            })
        }
        if (
            commentData.assignedUser &&
            !(this.mod.editor.mod as any).collab.pastParticipants.find(
                (participant: {id: number}) =>
                    participant.id === commentData.assignedUser
            )
        ) {
            ;(this.mod.editor.mod as any).collab.pastParticipants.push({
                id: commentData.assignedUser,
                name: commentData.assignedUsername || ""
            })
        }
        if (!this.comments[commentData.id]) {
            this.comments[commentData.id] = new Comment(commentData)
        }
        if (local || !this.mod.interactions.isCurrentlyEditing()) {
            ;(this.mod.editor.mod as any).marginboxes.updateDOM()
        }
    }

    updateComment(commentData: any): void {
        this.updateLocalComment(commentData, true)
        this.unsent.push({
            type: "update",
            id: commentData.id
        })
        this.mustSend()
    }

    updateLocalComment(commentData: any, local?: boolean): void {
        if (
            commentData.assignedUser &&
            !(this.mod.editor.mod as any).collab.pastParticipants.find(
                (participant: {id: number}) =>
                    participant.id === commentData.assignedUser
            )
        ) {
            ;(this.mod.editor.mod as any).collab.pastParticipants.push({
                id: commentData.assignedUser,
                name: commentData.assignedUsername || ""
            })
        }
        if (this.comments[commentData.id]) {
            Object.assign(this.comments[commentData.id], commentData)
        }
        if (local || !this.mod.interactions.isCurrentlyEditing()) {
            ;(this.mod.editor.mod as any).marginboxes.updateDOM()
        }
    }

    removeCommentMarks(id: number | string): void {
        // remove comment marks with the given ID in both views.
        ;[
            this.mod.editor.view,
            (this.mod.editor.mod as any).footnotes.fnEditor.view
        ].forEach((view: EditorView) => {
            const tr = view.state.tr,
                markType = view.state.schema.marks.comment.create({id})
            view.state.doc.descendants((node, pos) => {
                const nodeStart = pos,
                    nodeEnd = pos + node.nodeSize
                node.marks.forEach(mark => {
                    if (mark.type.name === "comment" && mark.attrs.id === id) {
                        this.removeMark(tr, nodeStart, nodeEnd, markType)
                    }
                })
            })
            if (tr.steps.length) {
                view.dispatch(tr)
            }
        })
    }

    deleteLocalComment(id: number | string, local?: boolean): boolean {
        const found = this.comments[id]
        if (found) {
            delete this.comments[id]
            if (local || !this.mod.interactions.isCurrentlyEditing()) {
                ;(this.mod.editor.mod as any).marginboxes.updateDOM()
            }
            return true
        }
        if (local || !this.mod.interactions.isCurrentlyEditing()) {
            ;(this.mod.editor.mod as any).marginboxes.updateDOM()
        }
        return false
    }

    // Removes the comment from store, optionally also removes marks from document.
    deleteComment(id: number | string, removeMarks?: boolean): void {
        if (this.deleteLocalComment(id, true)) {
            this.unsent.push({
                type: "delete",
                id
            })
            if (removeMarks) {
                this.removeCommentMarks(id)
            }
            this.mustSend()
        }
    }

    addLocalAnswer(
        id: number | string,
        answer: any,
        local?: boolean
    ): void {
        if (this.comments[id]) {
            if (!this.comments[id].answers) {
                this.comments[id].answers = []
            }
            const answerFound = this.comments[id].answers.find(
                (existingAnswer: any) => existingAnswer.id === answer.id
            )
            if (!answerFound) {
                this.comments[id].answers.push(answer)
            }
        }

        if (local || !this.mod.interactions.isCurrentlyEditing()) {
            ;(this.mod.editor.mod as any).marginboxes.updateDOM()
            if (!local && this.mod.interactions.activeCommentId === id) {
                this.mod.interactions.activateComment(id)
            }
        }
    }

    addAnswer(id: number | string, answer: any): void {
        answer.id = randomCommentId()
        this.addLocalAnswer(id, answer, true)
        this.unsent.push({
            type: "add_answer",
            id,
            answerId: answer.id
        })
        this.mustSend()
    }

    deleteLocalAnswer(
        id: number | string,
        answerId: number | string,
        local?: boolean
    ): void {
        if (this.comments[id]?.answers) {
            this.comments[id].answers = this.comments[id].answers.filter(
                (answer: any) => answer.id !== answerId
            )
        }
        if (local || !this.mod.interactions.isCurrentlyEditing()) {
            ;(this.mod.editor.mod as any).marginboxes.updateDOM()
            if (!local && this.mod.interactions.activeCommentId === id) {
                this.mod.interactions.activateComment(id)
            }
        }
    }

    deleteAnswer(id: number | string, answerId: number | string): void {
        this.deleteLocalAnswer(id, answerId, true)
        this.unsent.push({
            type: "delete_answer",
            id,
            answerId
        })
        this.mustSend()
    }

    updateLocalAnswer(
        id: number | string,
        answerId: number | string,
        answerText: string,
        local?: boolean
    ): void {
        if (this.comments[id]?.answers) {
            const answer = this.comments[id].answers.find(
                (existingAnswer: any) => existingAnswer.id === answerId
            )
            if (answer) {
                answer.answer = answerText
            }
        }
        if (local || !this.mod.interactions.isCurrentlyEditing()) {
            ;(this.mod.editor.mod as any).marginboxes.updateDOM()
            if (!local && this.mod.interactions.activeCommentId === id) {
                this.mod.interactions.activateComment(id)
            }
        }
    }

    updateAnswer(
        id: number | string,
        answerId: number | string,
        answerText: string
    ): void {
        this.updateLocalAnswer(id, answerId, answerText, true)
        this.unsent.push({
            type: "update_answer",
            id,
            answerId
        })
        this.mustSend()
    }

    unsentEvents(): any[] {
        const result: any[] = []
        for (let i = 0; i < this.unsent.length; i++) {
            const event = this.unsent[i]
            if (event.type == "delete") {
                result.push({
                    type: "delete",
                    id: event.id
                })
            } else if (event.type == "update") {
                const found = this.comments[event.id as number | string]
                if (found?.id) {
                    result.push(Object.assign({type: "update"}, found))
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            } else if (event.type == "create") {
                const found = this.comments[event.id as number | string]
                if (found?.id) {
                    result.push(Object.assign({type: "create"}, found))
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            } else if (event.type == "add_answer") {
                const found = this.comments[event.id as number | string]
                let foundAnswer
                if (found?.id && found?.answers) {
                    foundAnswer = found.answers.find(
                        (answer: any) => answer.id === event.answerId
                    )
                }
                if (foundAnswer) {
                    result.push(
                        Object.assign({}, foundAnswer, {
                            type: "add_answer",
                            id: event.id,
                            answerId: foundAnswer.id
                        })
                    )
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            } else if (event.type == "delete_answer") {
                const found = this.comments[event.id as number | string]
                if (found?.id && found?.answers) {
                    result.push({
                        type: "delete_answer",
                        id: event.id,
                        answerId: event.answerId
                    })
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            } else if (event.type == "update_answer") {
                const found = this.comments[event.id as number | string]
                let foundAnswer
                if (found?.id && found?.answers) {
                    foundAnswer = found.answers.find(
                        (answer: any) => answer.id === event.answerId
                    )
                }
                if (foundAnswer) {
                    result.push(
                        Object.assign({}, foundAnswer, {
                            type: "update_answer",
                            id: event.id,
                            answerId: foundAnswer.id
                        })
                    )
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            }
        }
        return result
    }

    eventsSent(n: any[]): void {
        this.unsent = this.unsent.slice(n.length)
    }

    receive(events: any[]): void {
        events.forEach(event => {
            if (event.type == "delete") {
                this.deleteLocalComment(event.id, false)
            } else if (event.type == "create") {
                this.addLocalComment(event, false)
            } else if (event.type == "update") {
                this.updateLocalComment(event, false)
            } else if (event.type == "add_answer") {
                this.addLocalAnswer(
                    event.id,
                    {
                        answer: event.answer,
                        id: event.answerId,
                        date: event.date,
                        user: event.user,
                        username: event.username
                    },
                    false
                )
            } else if (event.type == "delete_answer") {
                this.deleteLocalAnswer(event.id, event.answerId, false)
            } else if (event.type == "update_answer") {
                this.updateLocalAnswer(
                    event.id,
                    event.answerId,
                    event.answer,
                    false
                )
            }
        })
    }
}
