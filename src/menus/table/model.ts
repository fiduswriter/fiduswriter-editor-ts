import type {Node} from "prosemirror-model"
import type {EditorState, Transaction} from "prosemirror-state"
import {
    addColumnAfter,
    addColumnBefore,
    addRowAfter,
    addRowBefore,
    deleteColumn,
    deleteRow,
    mergeCells,
    splitCell,
    toggleHeaderCell,
    toggleHeaderColumn,
    toggleHeaderRow
} from "prosemirror-tables"
import {TableConfigurationDialog} from "../../dialogs/index.js"
import type {Editor} from "../../types.js"

// from https://github.com/ProseMirror/prosemirror-tables/blob/master/src/util.js
const findTable = (state: EditorState) => {
    const $head = state.selection.$head
    for (let d = $head.depth; d > 0; d--) {
        if ($head.node(d).type.name == "table") {
            return $head.node(d)
        }
    }
    return false
}

// Adjusted from https://github.com/ProseMirror/prosemirror-tables/blob/master/src/commands.js
export function deleteTable(
    state: EditorState,
    dispatch?: (tr: Transaction) => void
): boolean {
    const $pos = state.selection.$anchor
    for (let d = $pos.depth; d > 0; d--) {
        const node = $pos.node(d)
        if (node.type.name == "table") {
            if (dispatch) {
                dispatch(
                    state.tr
                        .delete($pos.before(d), $pos.after(d))
                        .scrollIntoView()
                )
            }
            return true
        }
    }
    return false
}

const tableAddedFromTemplate = (state: EditorState) => {
    const $head = state.selection.$head
    for (let d = $head.depth; d > 0; d--) {
        if ($head.node(d).type.name == "table") {
            if ($head.node(d - 1).type.name === "table_part") {
                return true
            } else {
                return false
            }
        }
    }
    return true
}

const tableAddedByUser = (table: Node, userId: number) =>
    table.attrs.track.find(
        (track: {type: string; user: number}) =>
            track.type === "insertion" && track.user === userId
    )
        ? true
        : false
export const tableMenuModel = () => ({
    content: [
        {
            title: (editor: Editor) =>
                `${gettext("Add row above")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext("Add a row above the current row"),
            order: 0,
            action: (editor: Editor) => {
                addRowBefore(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr.setMeta("untracked", true))
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                if (
                    !table ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            title: (editor: Editor) =>
                `${gettext("Add row below")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext("Add a row below the current row"),
            order: 1,
            action: (editor: Editor) => {
                addRowAfter(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr.setMeta("untracked", true))
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                if (
                    !table ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            title: (editor: Editor) =>
                `${gettext("Add column left")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext("Add a column to the left of the current column"),
            order: 2,
            action: (editor: Editor) => {
                addColumnBefore(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr.setMeta("untracked", true))
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                if (
                    !table ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            title: (editor: Editor) =>
                `${gettext("Add column right")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext("Add a column to the right of the current column"),
            order: 3,
            action: (editor: Editor) => {
                addColumnAfter(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr.setMeta("untracked", true))
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                if (
                    !table ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            type: "separator",
            order: 4
        },
        {
            title: (editor: Editor) =>
                `${gettext("Delete row")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext("Delete current row"),
            order: 5,
            action: (editor: Editor) => {
                deleteRow(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr.setMeta("untracked", true))
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                if (
                    !table ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            title: (editor: Editor) =>
                `${gettext("Delete column")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext("Delete current column"),
            order: 6,
            action: (editor: Editor) => {
                deleteColumn(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr.setMeta("untracked", true))
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                if (
                    !table ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            type: "separator",
            order: 7
        },
        {
            title: (editor: Editor) =>
                `${gettext("Merge cells")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext("Merge selected cells"),
            order: 8,
            action: (editor: Editor) => {
                mergeCells(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr.setMeta("untracked", true))
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                const selection = editor.currentView.state
                    .selection as unknown as {
                    jsonID: string
                    $headCell: {pos: number}
                    $anchorCell: {pos: number}
                }
                if (
                    !table ||
                    selection.jsonID !== "cell" ||
                    selection.$headCell.pos ===
                        selection.$anchorCell.pos ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            title: (editor: Editor) =>
                `${gettext("Split cells")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext("Split selected cell"),
            order: 9,
            action: (editor: Editor) => {
                splitCell(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr.setMeta("untracked", true))
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                const selection = editor.currentView.state
                    .selection as unknown as {
                    jsonID: string
                    $headCell: {pos: number}
                    $anchorCell: {
                        pos: number
                        nodeAfter: {attrs: {rowspan: number; colspan: number}}
                    }
                }
                if (
                    !table ||
                    selection.jsonID !== "cell" ||
                    selection.$headCell.pos !==
                        selection.$anchorCell.pos ||
                    (selection.$anchorCell.nodeAfter.attrs.rowspan === 1 &&
                        selection.$anchorCell.nodeAfter.attrs.colspan ===
                            1) ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            type: "separator",
            order: 10
        },
        {
            title: (editor: Editor) =>
                `${gettext("Toggle header row")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext("Toggle header-status of currently selected row"),
            order: 11,
            action: (editor: Editor) => {
                toggleHeaderRow(
                    editor.currentView.state,
                    editor.currentView.dispatch
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                if (
                    !table ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            title: (editor: Editor) =>
                `${gettext("Toggle header column")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext(
                "Toggle header-status of currently selected column"
            ),
            order: 12,
            action: (editor: Editor) => {
                toggleHeaderColumn(
                    editor.currentView.state,
                    editor.currentView.dispatch
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                if (
                    !table ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            title: (editor: Editor) =>
                `${gettext("Toggle header cell")}${editor.view.state.doc.attrs.tracked ? ` (${gettext("Not tracked")})` : ""}`,
            type: "action",
            tooltip: gettext(
                "Toggle header-status of currently selected cells"
            ),
            order: 13,
            action: (editor: Editor) => {
                toggleHeaderCell(
                    editor.currentView.state,
                    editor.currentView.dispatch
                )
            },
            disabled: (editor: Editor) => {
                const table = findTable(editor.currentView.state)
                if (
                    !table ||
                    (["write-tracked", "review-tracked"].includes(
                        (editor.docInfo.access_rights as string)
                    ) &&
                        !tableAddedByUser(table, editor.user.id))
                ) {
                    return true
                } else {
                    return false
                }
            }
        },
        {
            type: "separator",
            order: 14
        },
        {
            title: `${gettext("Configure")} ...`,
            type: "action",
            tooltip: gettext("Configure the table."),
            order: 15,
            action: (editor: Editor) => {
                const dialog = new TableConfigurationDialog(editor)
                dialog.init()
                return false
            },
            disabled: (editor: Editor) => !findTable(editor.currentView.state)
        },
        {
            title: gettext("Delete table"),
            type: "action",
            icon: "trash-alt",
            tooltip: gettext("Delete currently selected table"),
            order: 16,
            action: (editor: Editor) => {
                deleteTable(
                    editor.currentView.state,
                    editor.currentView.dispatch
                )
            },
            disabled: (editor: Editor) => tableAddedFromTemplate(editor.currentView.state)
        }
    ]
})
