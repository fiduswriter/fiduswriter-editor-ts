import {ModCommentInteractions} from "./interactions.js"
import {ModCommentStore} from "./store.js"
import type {Editor} from "../types.js"

export class ModComments {
    editor: Editor
    store: ModCommentStore
    interactions: ModCommentInteractions

    constructor(editor: Editor) {
        editor.mod.comments = this
        this.editor = editor
        this.store = new ModCommentStore(this)
        this.interactions = new ModCommentInteractions(this)
    }
}
