import {toggleMark} from "prosemirror-commands"
import type {EditorView} from "prosemirror-view"

import {randomAnchorId} from "@fiduswriter/document/schema/common/index"
import {COMMENT_ONLY_ROLES} from "../../index.js"
import {checkProtectedInSelection} from "../../state_plugins/document_template.js"
import type {AccessRole, Editor} from "../../types.js"
import {acceptAll, rejectAll} from "../../track/index.js"

const tracksInSelection = (view: EditorView): boolean => {
    // Check whether track marks are present within the range of selection
    let tracks = false
    const from = view.state.selection.from,
        to = view.state.selection.to

    view.state.doc.nodesBetween(from, to, (node, pos) => {
        if (pos < from && !node.isInline) {
            return true
        } else if (tracks) {
            return false
        } else if (node.attrs.track?.length) {
            tracks = true
        } else if (
            node.marks?.find(mark => {
                if (
                    ["deletion", "format_change"].includes(mark.type.name) ||
                    (mark.type.name === "insertion" && !mark.attrs.approved)
                ) {
                    return true
                } else {
                    return false
                }
            })
        ) {
            tracks = true
        }
        return false
    })
    return tracks
}

interface MenuItem {
    type: string
    title: string
    icon?: string
    order: number
    action: (editor: Editor) => boolean | void
    hidden?: (editor: Editor) => boolean
    selected?: (editor: Editor) => boolean
    disabled?: (editor: Editor) => boolean
}

export const selectionMenuModel = (): {content: MenuItem[]} => ({
    content: [
        {
            type: "button",
            title: gettext("Comment"),
            icon: "comment",
            action: (editor: Editor) => {
                ;(
                    editor.mod.comments as {
                        interactions: {createNewComment: () => void}
                    }
                ).interactions.createNewComment()
                return false
            },
            hidden: (editor: Editor) =>
                editor.currentView.state.selection.$anchor.depth < 1,
            selected: (editor: Editor) =>
                !!editor.currentView.state.selection.$head
                    .marks()
                    .some(mark => mark.type.name === "comment"),
            disabled: (editor: Editor) => {
                if (editor.currentView === editor.view) {
                    //  main editor
                    return checkProtectedInSelection(editor.view.state)
                } else {
                    // footnote editor
                    return false
                }
            },
            order: 1
        },
        {
            type: "button",
            title: gettext("Anchor"),
            icon: "anchor",
            action: (editor: Editor) => {
                const mark = editor.currentView.state.schema.marks["anchor"]
                const command = toggleMark(mark, {id: randomAnchorId()})
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            disabled: (editor: Editor) => {
                if (editor.currentView === editor.view) {
                    //  main editor
                    return (
                        checkProtectedInSelection(editor.view.state) ||
                        COMMENT_ONLY_ROLES.includes(
                            editor.docInfo.access_rights as AccessRole
                        )
                    )
                } else {
                    // footnote editor
                    return COMMENT_ONLY_ROLES.includes(
                        editor.docInfo.access_rights as AccessRole
                    )
                }
            },
            hidden: (editor: Editor) =>
                editor.currentView.state.selection.$anchor.depth < 1,
            selected: (editor: Editor) =>
                !!editor.currentView.state.selection.$head
                    .marks()
                    .some(mark => mark.type.name === "anchor"),
            order: 2
        },
        {
            type: "button",
            title: gettext("Accept all in selection"),
            icon: "check-double",
            action: (editor: Editor) =>
                acceptAll(
                    editor.currentView,
                    editor.currentView.state.selection.from,
                    editor.currentView.state.selection.to
                ),
            disabled: (editor: Editor) => editor.docInfo.access_rights !== "write",
            hidden: (editor: Editor) =>
                editor.currentView.state.selection.$anchor.depth < 1 ||
                !tracksInSelection(editor.currentView),
            order: 3
        },
        {
            type: "button",
            title: gettext("Reject all in selection"),
            icon: "trash",
            action: (editor: Editor) =>
                rejectAll(
                    editor.currentView,
                    editor.currentView.state.selection.from,
                    editor.currentView.state.selection.to
                ),
            disabled: (editor: Editor) => editor.docInfo.access_rights !== "write",
            hidden: (editor: Editor) =>
                editor.currentView.state.selection.$anchor.depth < 1 ||
                !tracksInSelection(editor.currentView),
            order: 4
        }
    ]
})
