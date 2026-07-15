import type {FigureDialog} from "../../dialogs/index.js"

export const figureMenuAction = (
    value: string,
    figureDialog: FigureDialog
): void => {
    const buttonDOM = document.querySelector(".figure-width")
    if (!buttonDOM?.firstElementChild) {
        return
    }
    buttonDOM.firstElementChild.innerHTML = `${value} %`
    figureDialog.width = value
}
