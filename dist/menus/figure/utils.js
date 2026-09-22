export const figureMenuAction = (value, figureDialog) => {
    const buttonDOM = document.querySelector(".figure-width");
    if (!buttonDOM?.firstElementChild) {
        return;
    }
    buttonDOM.firstElementChild.innerHTML = `${value} %`;
    figureDialog.width = value;
};
//# sourceMappingURL=utils.js.map