import {ModCommentInteractions} from "./interactions.js"
import {ModCommentStore} from "./store.js"

export class ModComments {
    constructor(editor) {
        editor.mod.comments = this
        this.editor = editor
        new ModCommentStore(this)
        new ModCommentInteractions(this)
    }
}
