// A headless editor shell for the fuzz harnesses.
//
// Mirrors the plugin assembly of src/index.ts (initEditor) but runs under
// happy-dom with no WebSocket, no workers and no network. The real editor
// modules (collab, comments store, track, databases) run against real
// ProseMirror EditorViews mounted in the DOM.
//
// Nothing in here fakes ProseMirror: state, transforms, collab and the
// editor's own dist modules are the production code.

import "../setup.js"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {fnSchema} from "@fiduswriter/document/schema/footnotes"
import {fnNodeToPmNode} from "@fiduswriter/document/schema/footnotes_convert"
import {collab, receiveTransaction} from "prosemirror-collab"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"
import {history} from "prosemirror-history"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {Step} from "prosemirror-transform"
import {tableEditing} from "prosemirror-tables"

import {ModCommentStore} from "../../dist/comments/store.js"
import {ModBibliographyDB} from "../../dist/databases/bibliography.js"
import {ModImageDB} from "../../dist/databases/images.js"
import {
    accessRightsPlugin,
    citationRenderPlugin,
    clipboardPlugin,
    codeBlockPlugin,
    collabCaretsPlugin,
    commentsPlugin,
    figurePlugin,
    footnoteMarkersPlugin,
    jumpHiddenNodesPlugin,
    linksPlugin,
    orderedListMenuPlugin,
    searchPlugin,
    tablePlugin,
    trackPlugin
} from "../../dist/state_plugins/index.js"

// A footnote editor stand-in with the same applyDiffs code path as
// src/footnotes/editor.ts: real fnSchema, real collab plugin, real state.
class FakeFnEditor {
    constructor(editor) {
        this.mod = {editor}
        this.schema = fnSchema
        this.view = new EditorView(document.createElement("div"), {
            state: EditorState.create({
                schema: fnSchema,
                doc: fnSchema.nodeFromJSON({type: "doc", content: []}),
                plugins: [collab({clientID: editor.client_id}), history()]
            }),
            dispatchTransaction(tr) {
                this.updateState(this.state.apply(tr))
            }
        })
    }

    applyDiffs(diffs, cid) {
        const steps = diffs.map(j => Step.fromJSON(this.view.state.schema, j))
        const clientIds = diffs.map(_ => cid)
        const tr = receiveTransaction(this.view.state, steps, clientIds)
        tr.setMeta("remote", true)
        this.view.dispatch(tr)
    }

    // Same logic as src/footnotes/editor.ts removeFootnote: removes the
    // footnote content block at `index` from the footnote editor doc via the
    // footnote transaction the footnote_markers plugin is assembling.
    removeFootnote(index, tr) {
        const collab = this.mod.editor.mod.collab
        if (collab?.doc?.receiving) {
            return
        }
        const childCount = this.view.state.doc.childCount
        if (index >= childCount) {
            return
        }
        let startPos = 0
        for (let i = 0; i < index; i++) {
            startPos += this.view.state.doc.child(i).nodeSize
        }
        const endPos = startPos + this.view.state.doc.child(index).nodeSize
        tr.delete(startPos, endPos)
    }

    // Same logic as src/footnotes/editor.ts renderFootnote: inserts the
    // footnote content node at the given index into the footnote doc.
    renderFootnote(content, index = 0, tr) {
        const node = fnNodeToPmNode(content)
        let pos = 0
        const childCount = tr.doc.childCount
        for (let i = 0; i < index && i < childCount; i++) {
            pos += tr.doc.child(i).nodeSize
        }
        tr.insert(pos, node)
    }

    renderAllFootnotes() {}
}

export function makeFakeEditor({
    doc,
    clientID = "fuzz-client",
    plugins = undefined
} = {}) {
    const container = document.createElement("div")
    document.body.appendChild(container)

    const editor = {
        schema: docSchema,
        client_id: clientID,
        user: {id: 1, username: "fuzz_user"},
        clientTimeAdjustment: 0,
        // No WebSocket: sendToCollaborators() and friends no-op.
        ws: undefined,
        app: {
            isOffline: () => false,
            settings: {APPS: [], VERSION: "0.0.0-fuzz"}
        },
        docInfo: {
            access_rights: "write",
            dir: "ltr",
            version: 0,
            id: 1,
            updated: new Date(),
            confirmedDoc: doc,
            path: "/"
        },
        dom: container,
        // Minimal menu-model surface: selection menu views filter this
        // model against the document template.
        menu: {selectionMenuModel: {content: []}},
        scrollIdIntoView() {},
        mod: {}
    }
    editor.currentView = undefined // set after view creation

    editor.mod.comments = {
        editor,
        interactions: {
            isCurrentlyEditing: () => false,
            activeCommentId: false,
            activateComment() {}
        }
    }
    new ModCommentStore(editor.mod.comments)

    const dbMod = {editor}
    editor.mod.db = dbMod
    new ModBibliographyDB(dbMod).setDB({})
    new ModImageDB(dbMod).setDB({})

    editor.mod.citations = {
        footnoteNumberOverride() {},
        resetCitations() {},
        layoutCitations() {},
        init() {}
    }
    editor.mod.documentTemplate = {
        getCitationStyles: async () => []
    }
    editor.mod.marginboxes = {
        updateDOM() {},
        view() {},
        filterOptions: {comments: false}
    }
    // The footnote markers plugin reads layout.updateDOM() on every view
    // update, so this must exist before the main view is created.
    editor.mod.footnotes = {
        layout: {updateDOM() {}},
        fnEditor: new FakeFnEditor(editor)
    }

    const statePlugins = plugins || [
        [linksPlugin, () => ({editor})],
        [collab, () => ({clientID: clientID})],
        [history],
        [dropCursor],
        [gapCursor],
        [tableEditing],
        [jumpHiddenNodesPlugin],
        [citationRenderPlugin, () => ({editor})],
        [collabCaretsPlugin, () => ({editor})],
        [footnoteMarkersPlugin, () => ({editor})],
        [commentsPlugin, () => ({editor})],
        [clipboardPlugin, () => ({editor, viewType: "main"})],
        [accessRightsPlugin, () => ({editor})],
        [trackPlugin, () => ({editor})],
        [tablePlugin, () => ({editor})],
        [orderedListMenuPlugin, () => ({editor})],
        [figurePlugin, () => ({editor})],
        [codeBlockPlugin, () => ({editor})],
        [searchPlugin]
    ]

    const state = EditorState.create({
        schema: docSchema,
        doc,
        plugins: statePlugins.map(([plugin, opts]) =>
            plugin(opts ? opts() : undefined)
        )
    })

    const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
            this.updateState(this.state.apply(tr))
        }
    })
    editor.view = view
    editor.currentView = view

    return editor
}

// Wire a ModCollabDoc into the fake editor once it has been constructed:
// plugins (footnote markers, comment store) read editor.mod.collab.doc
// state and editor.mod.collab.pastParticipants.
export function attachCollabDoc(editor, collabDoc) {
    editor.mod.collab = {
        doc: collabDoc,
        pastParticipants: [],
        // Track plugin and collab carets ask for a color per participant id.
        colors: {ensureUserColor() {}},
        ensureUserColor() {},
        updateParticipantList() {}
    }
}

// Tear down DOM between fuzz iterations to avoid unbounded memory growth.
export function destroyFakeEditor(editor) {
    try {
        editor.view.destroy()
    } catch (_error) {
        // view may already be destroyed
    }
    try {
        editor.mod.footnotes.fnEditor.view.destroy()
    } catch (_error) {
        // as above
    }
    if (editor.dom.parentNode) {
        editor.dom.parentNode.removeChild(editor.dom)
    }
}
