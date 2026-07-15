import deepEqual from "fast-deep-equal"
import {baseKeymap} from "prosemirror-commands"
import {history, redo, undo} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {EditorState} from "prosemirror-state"
import {suggestionsPlugin, triggerCharacter} from "prosemirror-suggestions"
import {EditorView} from "prosemirror-view"

import {avatarTemplate, escapeText, findTarget} from "fwtoolkit"

import type {Editor} from "../../types.js"
import {notifyMentionedUser} from "./notify.js"
import {commentSchema} from "./schema.js"

export interface CommentMod {
    editor: Editor
    interactions: {
        updateComment: (args: {
            id: string
            comment: any
            isMajor: boolean
        }) => string
        deleteComment: (id: string) => void
        deactivateAll: () => void
        activeCommentId: string | boolean
        editComment: boolean
        updateDOM: () => void
        editor: CommentEditor
        cancelSubmit: () => void
        collapseSelectionToEnd: () => void
    }
}

interface CommentOptions {
    isMajor?: boolean
    isGlobal?: boolean
}

interface User {
    id: number
    name: string
    username: string
}

interface SuggestionArgs {
    range: {from: number; to: number}
    text: string
}

export class CommentEditor {
    mod: CommentMod
    id: string
    dom: HTMLElement
    text: any
    options: CommentOptions
    isMajor: boolean | undefined
    keepOpenAfterSubmit: boolean
    selectedTag: number
    userTaggerList: User[]
    plugins: any[]
    view!: EditorView
    viewDOM!: HTMLElement
    oldUserTags: number[]
    tagRange: {from: number; to: number} | false

    constructor(
        mod: CommentMod,
        id: string,
        dom: HTMLElement,
        text: any,
        options: CommentOptions = {}
    ) {
        this.mod = mod
        this.id = id
        this.dom = dom
        this.text = text
        this.options = options

        this.isMajor = this.options.isMajor

        this.keepOpenAfterSubmit = false
        this.selectedTag = 0
        this.userTaggerList = []
        this.oldUserTags = []
        this.tagRange = false
        this.plugins = [
            history(),
            suggestionsPlugin({
                escapeOnSelectionChange: true,
                matcher: triggerCharacter("@"),
                onEnter: (args: SuggestionArgs) => {
                    this.selectedTag = 0
                    this.tagRange = args.range
                    const search = args.text.slice(1)
                    if (search.length) {
                        this.setUserTaggerList(search)
                        this.showUserTagger()
                    }
                    return false
                },
                onChange: (args: SuggestionArgs) => {
                    this.selectedTag = 0
                    this.tagRange = args.range
                    const search = args.text.slice(1)
                    if (search.length) {
                        this.setUserTaggerList(search)
                        this.showUserTagger()
                    }
                    return false
                },
                onExit: (_args: SuggestionArgs) => {
                    this.selectedTag = 0
                    this.removeTagger()
                    return false
                },
                onKeyDown: ({event}: {event: KeyboardEvent}) => {
                    if (event.key === "ArrowDown") {
                        if (
                            this.userTaggerList.length >
                            this.selectedTag + 1
                        ) {
                            this.selectedTag += 1
                            this.showUserTagger()
                        }
                        return true
                    } else if (event.key === "ArrowUp") {
                        if (this.selectedTag > 0) {
                            this.selectedTag -= 1
                            this.showUserTagger()
                        }
                        return true
                    } else if (event.key === "Enter") {
                        return this.selectUserTag()
                    }
                    return false
                },
                escapeKeys: ["Escape", "ArrowRight", "ArrowLeft"]
            }),
            keymap(baseKeymap),
            keymap({
                "Mod-z": undo,
                "Mod-shift-z": undo,
                "Mod-y": redo,
                "Ctrl-Enter": () => {
                    this.submit()
                    return true
                }
            })
        ]
    }

    init(): void {
        this.initViewDOM()
        this.initView()
    }

    initViewDOM(): void {
        this.viewDOM = document.createElement("div")
        this.viewDOM.classList.add("ProseMirror-wrapper")
        this.dom.appendChild(this.viewDOM)
        this.dom.insertAdjacentHTML(
            "beforeend",
            `<input class="comment-is-major" type="checkbox" name="isMajor"
                ${this.options.isMajor ? "checked" : ""}/>
            <label>${gettext("High priority")}</label>
            <div class="comment-btns">
                <button class="submit fw-button fw-dark fw-disabled" type="submit">
                    ${this.id !== "-1" ? gettext("Edit") : gettext("Submit")}
                </button>
                <button class="cancel fw-button fw-orange" type="submit">
                    ${gettext("Cancel")}
                </button>
            </div>
            <div class="tagger"></div>`
        )
    }

    initView(): void {
        this.view = new EditorView(this.viewDOM, {
            state: EditorState.create({
                schema: commentSchema,
                doc: commentSchema.nodeFromJSON({
                    type: "doc",
                    content: this.text
                }),
                plugins: this.plugins
            }),
            dispatchTransaction: tr => {
                const newState = this.view.state.apply(tr)
                this.view.updateState(newState)
                this.updateButtons()
            }
        })
        this.oldUserTags = this.getUserTags()
        this.bind()
    }

    bind(): void {
        this.dom.addEventListener("click", event => {
            const el: {target?: HTMLElement} = {}
            switch (true) {
                case findTarget(event, "button.submit:not(.fw-disabled)", el):
                    {
                        const submittedId = this.submit()
                        if (this.keepOpenAfterSubmit) {
                            this.scrollToBottom()
                        } else if (this.options.isGlobal) {
                            if (submittedId) {
                                this.mod.interactions.deactivateAll()
                                this.mod.interactions.activeCommentId =
                                    submittedId
                                this.mod.interactions.editComment = false
                                this.mod.interactions.updateDOM()
                                const answerEditor =
                                    this.mod.interactions.editor
                                if (answerEditor?.view) {
                                    try {
                                        answerEditor.view.dom.focus({
                                            preventScroll: true
                                        })
                                    } catch {
                                        answerEditor.view.focus()
                                    }
                                }
                            } else {
                                this.mod.interactions.activeCommentId = false
                                this.mod.interactions.deactivateAll()
                                this.mod.interactions.collapseSelectionToEnd()
                            }
                        } else {
                            this.mod.interactions.activeCommentId = false
                            this.mod.interactions.deactivateAll()
                            this.mod.interactions.collapseSelectionToEnd()
                        }
                    }
                    break
                case findTarget(event, "button.cancel", el):
                    this.mod.interactions.cancelSubmit()
                    break
                case findTarget(event, ".ProseMirror-wrapper", el):
                    this.view.focus()
                    break
                case findTarget(event, ".tag-user", el):
                    this.selectedTag = Number.parseInt(
                        (el.target as HTMLElement).dataset.index || "0"
                    )
                    this.selectUserTag()
                    this.view.focus()
                    break
                case findTarget(event, ".comment-is-major", el):
                    this.isMajor = !this.isMajor
                    this.updateButtons()
                    break
            }
        })
    }

    hasChanged(): boolean {
        return (
            !deepEqual(
                this.text.length ? this.text : [{type: "paragraph"}],
                this.view.state.doc.toJSON().content || [{type: "paragraph"}]
            ) || this.options.isMajor !== this.isMajor
        )
    }

    updateButtons(): void {
        const submitButton = this.dom.querySelector("button.submit")
        if (this.hasChanged()) {
            submitButton?.classList.remove("fw-disabled")
        } else {
            submitButton?.classList.add("fw-disabled")
        }
    }

    submit(): string | false | void {
        const comment = this.view.state.doc.toJSON().content
        if (comment?.length > 0) {
            const id = this.mod.interactions.updateComment({
                id: this.id,
                comment,
                isMajor: this.isMajor || false
            })
            this.sendNotifications()
            return id
        } else {
            this.mod.interactions.deleteComment(this.id)
            return false
        }
    }

    sendNotifications(): void {
        const newUserTags = this.getUserTags().filter(
            id => !this.oldUserTags.includes(id)
        )
        if (newUserTags.length) {
            const comment = this.view.state.doc,
                docId = this.mod.editor.docInfo.id as number
            newUserTags.forEach(userId =>
                notifyMentionedUser(docId, userId, comment)
            )
        }
    }

    setUserTaggerList(search: string): void {
        const owner = this.mod.editor.docInfo.owner as unknown as User & {
            contacts: User[]
        }
        this.userTaggerList = owner.contacts
            .concat(owner)
            .filter(
                user =>
                    user.name.includes(search) ||
                    user.username.includes(search)
            )
    }

    showUserTagger(): void {
        if (!this.userTaggerList.length) {
            return
        }
        this.dom.querySelector("div.tagger")!.innerHTML = this.userTaggerList
            .map(
                (user, index) =>
                    `<div class="tag-user tag${index === this.selectedTag ? " fw-selected" : ""}" data-index="${index}">
                ${user ? avatarTemplate({user}) : '<span class="fw-string-avatar"></span>'}
                <h5 class="comment-user-name">${escapeText(user.name)}</h5>
            </div>`
            )
            .join("")
    }

    selectUserTag(): boolean {
        const user = this.userTaggerList[this.selectedTag]
        if (!user || !this.tagRange) {
            return false
        }
        const tr = this.view.state.tr.replaceRangeWith(
            this.tagRange.from,
            this.tagRange.to,
            this.view.state.schema.nodes.collaborator.create({
                id: user.id,
                name: user.name
            })
        )
        this.view.dispatch(tr)
        return true
    }

    getUserTags(): number[] {
        const users: number[] = []
        this.view.state.doc.descendants(node => {
            if (node.type.name === "collaborator") {
                users.push(node.attrs.id)
            }
        })
        return [...new Set(users)] // only unique values.
    }

    removeTagger(): void {
        const tagger = this.dom.querySelector("div.tagger")
        if (tagger) {
            tagger.innerHTML = ""
        }
        this.tagRange = false
        this.userTaggerList = []
    }

    scrollToBottom(): void {
        const activeMarginBox = document.querySelector(
            ".margin-box.comment.fw-active .comment-answer-container"
        )
        if (activeMarginBox) {
            ;(activeMarginBox as HTMLElement).scrollTop =
                activeMarginBox.scrollHeight
        }

        // scroll to bottom of the margin-box-container or global-comment-container
        // when new comments are added when the screens width is less than 1024px
        const currentScreenWidth =
            window.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth
        if (currentScreenWidth < 1024) {
            const activeMarginBoxContainer = document.querySelector(
                "#margin-box-container, #global-comment-container"
            )
            if (activeMarginBoxContainer) {
                ;(activeMarginBoxContainer as HTMLElement).scrollTop =
                    activeMarginBoxContainer.scrollHeight
            }
        }
    }
}
