import {Plugin} from "prosemirror-state"

import type {Editor} from "../../../src/types.js"

/**
 * ProseMirror plugin factory that keeps `editor.docInfo.confirmedDoc` in sync
 * with the current editor document.
 *
 * In normal Fidus Writer usage `confirmedDoc` is the last version confirmed by
 * the server, but in the standalone demo there is no server, so without this
 * plugin the confirmed document never reflects edits and exports/printing end
 * up empty or stale.
 */
export function confirmedDocPlugin(options: unknown): Plugin {
    const editor = (options as {editor: Editor}).editor
    return new Plugin({
        state: {
            init: (_config, state) => {
                editor.docInfo.confirmedDoc = state.doc
                return null
            },
            apply: (_tr, _value, _oldState, newState) => {
                editor.docInfo.confirmedDoc = newState.doc
                return null
            }
        }
    })
}

/**
 * Fidus Writer editor plugin that installs the confirmed-doc ProseMirror
 * plugin for demo/non-collaborative scenarios.
 */
export class ConfirmedDocEditorPlugin {
    editor: Editor

    constructor(editor: Editor) {
        this.editor = editor
    }

    init(): void {
        this.editor.statePlugins.push([
            confirmedDocPlugin,
            () => ({editor: this.editor})
        ])
    }
}
