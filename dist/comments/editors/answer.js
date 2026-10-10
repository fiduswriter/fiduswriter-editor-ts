import { TextSelection } from "prosemirror-state";
import { CommentEditor } from "./comment.js";
export class CommentAnswerEditor extends CommentEditor {
    keepOpenAfterSubmit;
    constructor(mod, id, dom, text, options = {}) {
        super(mod, id, dom, text, options);
        this.keepOpenAfterSubmit = true;
    }
    initViewDOM() {
        this.viewDOM = document.createElement("div");
        this.viewDOM.classList.add("ProseMirror-wrapper");
        this.dom.appendChild(this.viewDOM);
        this.dom.insertAdjacentHTML("beforeend", `<div class="comment-btns">
                <button class="submit fw-button fw-dark fw-disabled" type="submit">
                    ${this.options.answerId ? gettext("Edit") : gettext("Submit")}
                </button>
                <button class="cancel fw-button fw-orange" type="submit">
                    ${gettext("Cancel")}
                </button>
            </div>
            <div class="tagger"></div>`);
    }
    initView() {
        super.initView();
        if (this.options.answerId && this.view) {
            const selection = TextSelection.atEnd(this.view.state.doc);
            this.view.dispatch(this.view.state.tr.setSelection(selection).scrollIntoView());
        }
    }
    submit() {
        const text = this.view.state.doc.toJSON().content;
        if (!text) {
            return;
        }
        const interactions = this.mod.interactions;
        if (this.options.answerId) {
            interactions?.submitAnswerUpdate?.(this.id, this.options.answerId, text);
        }
        else {
            interactions?.createNewAnswer?.(this.id, text);
        }
        this.sendNotifications();
    }
}
//# sourceMappingURL=answer.js.map