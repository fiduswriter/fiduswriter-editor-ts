import {TextSelection} from "prosemirror-state"

import {CommentEditor, type CommentMod} from "./comment.js"

interface CommentAnswerOptions {
    answerId?: number
    isMajor?: boolean
}

export class CommentAnswerEditor extends CommentEditor {
    keepOpenAfterSubmit: boolean

    constructor(
        mod: CommentMod,
        id: string,
        dom: HTMLElement,
        text: unknown[],
        options: CommentAnswerOptions = {}
    ) {
        super(mod, id, dom, text, options)

        this.keepOpenAfterSubmit = true
    }

    initViewDOM(): void {
        this.viewDOM = document.createElement("div")
        this.viewDOM.classList.add("ProseMirror-wrapper")
        this.dom.appendChild(this.viewDOM)
        this.dom.insertAdjacentHTML(
            "beforeend",
            `<div class="comment-btns">
                <button class="submit fw-button fw-dark fw-disabled" type="submit">
                    ${(this.options as CommentAnswerOptions).answerId ? gettext("Edit") : gettext("Submit")}
                </button>
                <button class="cancel fw-button fw-orange" type="submit">
                    ${gettext("Cancel")}
                </button>
            </div>
            <div class="tagger"></div>`
        )
    }

    initView(): void {
        super.initView()
        if ((this.options as CommentAnswerOptions).answerId && this.view) {
            const selection = TextSelection.atEnd(this.view.state.doc)
            this.view.dispatch(
                this.view.state.tr.setSelection(selection).scrollIntoView()
            )
        }
    }

    submit(): void {
        const text = this.view.state.doc.toJSON().content as unknown[]
        if (!text) {
            return
        }
        const interactions = (this.mod as {interactions?: {submitAnswerUpdate?: (commentId: string, answerId: number, text: unknown[]) => void; createNewAnswer?: (commentId: string, text: unknown[]) => void}}).interactions
        if ((this.options as CommentAnswerOptions).answerId) {
            interactions?.submitAnswerUpdate?.(
                this.id,
                (this.options as CommentAnswerOptions).answerId as number,
                text
            )
        } else {
            interactions?.createNewAnswer?.(this.id, text)
        }
        this.sendNotifications()
    }
}
