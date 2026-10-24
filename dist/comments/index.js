import { ModCommentInteractions } from "./interactions.js";
import { ModCommentStore } from "./store.js";
export class ModComments {
    editor;
    store;
    interactions;
    constructor(editor) {
        editor.mod.comments = this;
        this.editor = editor;
        this.store = new ModCommentStore(this);
        this.interactions = new ModCommentInteractions(this);
    }
}
//# sourceMappingURL=index.js.map