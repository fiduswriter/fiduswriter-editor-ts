import type {NodeSelection} from "prosemirror-state"

import type {Editor} from "../../types.js"

import {FigureDialog} from "../../dialogs/index.js"
import {figureMenuAction} from "./utils.js"

const selectedNode = (editor: Editor) =>
    (editor.currentView.state.selection as NodeSelection).node

export const figureMenuModel = () => ({
    content: [
        {
            title: `${gettext("Configure")} ...`,
            type: "action",
            tooltip: gettext("Configure the figure."),
            order: 1,
            action: (editor: Editor) => {
                const dialog = new FigureDialog(editor)
                dialog.init()
                return false
            },
            disabled: (editor: Editor) =>
                !(
                    selectedNode(editor)?.type.name === "figure"
                ) ||
                selectedNode(editor)?.attrs.track?.find(
                    (track: {type: string}) => track.type === "deletion"
                )
        },
        {
            title: gettext("Delete figure"),
            type: "action",
            icon: "trash-alt",
            tooltip: gettext("Delete the figure"),
            order: 2,
            action: (editor: Editor) => {
                const tr = editor.currentView.state.tr
                tr.deleteSelection()
                editor.currentView.dispatch(tr)
            },
            disabled: (editor: Editor) =>
                !(
                    selectedNode(editor)?.type.name === "figure"
                ) ||
                selectedNode(editor)?.attrs.track?.find(
                    (track: {type: string}) => track.type === "deletion"
                )
        }
    ]
})

export const figureWidthMenuModel = () => ({
    content: [
        {
            title: "100 %",
            type: "action",
            order: 0,
            value: "100",
            action: (figureDialog: InstanceType<typeof FigureDialog>) => {
                figureMenuAction("100", figureDialog)
            },
            selected: false
        },
        {
            title: "75 %",
            type: "action",
            order: 1,
            value: "75",
            action: (figureDialog: InstanceType<typeof FigureDialog>) => {
                figureMenuAction("75", figureDialog)
            },
            selected: false
        },
        {
            title: "50 %",
            type: "action",
            order: 2,
            value: "50",
            action: (figureDialog: InstanceType<typeof FigureDialog>) => {
                figureMenuAction("50", figureDialog)
            },
            selected: false
        },
        {
            title: "25 %",
            type: "action",
            order: 3,
            value: "25",
            action: (figureDialog: InstanceType<typeof FigureDialog>) => {
                figureMenuAction("25", figureDialog)
            },
            selected: false
        }
    ]
})
