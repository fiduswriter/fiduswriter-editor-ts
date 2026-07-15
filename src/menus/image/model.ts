import {CopyrightDialog, type Copyright} from "../../copyright_dialog/index.js"

interface FigureDialog {
    copyright: Copyright | false
    imgId: number | false
    imgDb: unknown | false
    layoutMathEditor(): void
}

export const imageMenuModel = () => ({
    content: [
        {
            title: gettext("Set Copyright"),
            type: "action",
            tooltip: gettext("Specify copyright information"),
            order: 0,
            action: (figureDialog: FigureDialog) => {
                const dialog = new CopyrightDialog(
                    figureDialog.copyright as Copyright
                )
                dialog.init().then(copyright => {
                    if (copyright) {
                        figureDialog.copyright = copyright
                    }
                })
            }
        },
        {
            title: gettext("Remove image"),
            type: "action",
            tooltip: gettext("Remove the image that is previewed"),
            order: 1,
            action: (figureDialog: FigureDialog) => {
                figureDialog.imgId = false
                figureDialog.imgDb = false
                figureDialog.copyright = false
                figureDialog.layoutMathEditor()
            }
        }
    ]
})
