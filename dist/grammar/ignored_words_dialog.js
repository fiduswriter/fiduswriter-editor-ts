import { Dialog, escapeText } from "fwtoolkit";
/**
 * The "Ignored words" dialog (Tools → Spell/grammar checker): manual
 * editing of the per-user ignore lists — one word or phrase per line in
 * the first textarea, one rule id per line in the second. Saved through
 * ModGrammar.setIgnoredWords/setIgnoredRules, which persist via the host
 * and refresh the marks.
 */
export class DialogIgnoredWords {
    editor;
    dialog;
    constructor(editor) {
        this.editor = editor;
    }
    init() {
        const grammar = this.editor.mod.grammar;
        const sessionOnly = this.editor.app.saveIgnoredWords === undefined &&
            this.editor.app.saveIgnoredRules === undefined;
        this.dialog = new Dialog({
            width: 430,
            height: 540,
            title: gettext("Ignored words"),
            body: `<table class="fw-dialog-table">
                <tbody>
                    <tr>
                        <th><h4 class="fw-tablerow-title">${gettext("Ignored words")}</h4></th>
                    </tr>
                    <tr>
                        <td><p>${gettext("Words and word combinations that the spell checker should accept as correct. One word or phrase per line.")}</p></td>
                    </tr>
                    <tr>
                        <td><textarea class="ignored-words fw-entry-field" rows="8" spellcheck="false">${escapeText((grammar?.getIgnoredWords() ?? []).join("\n"))}</textarea></td>
                    </tr>
                    <tr>
                        <th><h4 class="fw-tablerow-title">${gettext("Ignored rules")}</h4></th>
                    </tr>
                    <tr>
                        <td><p>${gettext("Rules that will not be reported. Usually added via 'Ignore rule' on an underline.")}</p></td>
                    </tr>
                    <tr>
                        <td><textarea class="ignored-rules fw-entry-field" rows="4" spellcheck="false">${escapeText((grammar?.getIgnoredRules() ?? []).join("\n"))}</textarea></td>
                    </tr>
                    ${sessionOnly
                ? `<tr>
                        <td><p>${gettext("Changes apply to this session only.")}</p></td>
                    </tr>`
                : ""}
                </tbody>
            </table>`,
            buttons: [
                {
                    text: gettext("Save"),
                    classes: "fw-dark",
                    click: () => {
                        this.save();
                        return false;
                    }
                },
                { type: "close" }
            ]
        });
        this.dialog.open();
    }
    save() {
        const grammar = this.editor.mod.grammar;
        const wordsEl = this.dialog.dialogEl.querySelector("textarea.ignored-words");
        const rulesEl = this.dialog.dialogEl.querySelector("textarea.ignored-rules");
        if (!grammar || !wordsEl || !rulesEl) {
            return;
        }
        // The setters no-op on unchanged lists, so only what was edited
        // is persisted.
        grammar.setIgnoredWords(wordsEl.value.split("\n"));
        grammar.setIgnoredRules(rulesEl.value.split("\n"));
        this.dialog.close();
    }
}
//# sourceMappingURL=ignored_words_dialog.js.map