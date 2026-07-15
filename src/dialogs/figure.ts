import deepEqual from "fast-deep-equal"
import type {Node} from "prosemirror-model"
import type {JSONValue} from "@fiduswriter/document"
import type {ContentMenuInit} from "fwtoolkit/content_menu"
import {ContentMenu, Dialog, addAlert, dropdownSelect} from "fwtoolkit"
import {ImageSelectionDialog} from "@fiduswriter/image-manager/selection_dialog"
import {E2EEEncryptor} from "fwtoolkit/e2ee/encryptor"

import {configureFigureTemplate} from "./templates.js"
import {randomFigureId} from "@fiduswriter/document/schema/common/index"
import type {Editor, EditorImageDB} from "../types.js"

interface MathfieldElementClass {
    strings: Record<string, Record<string, string>>
    locale: string
    plonkSound: null
    keypressSound: null
    prototype: {
        getValue: () => string
        select: () => void
    }
}

interface MathfieldElementInstance extends HTMLElement {
    value: string
    getValue(): string
    select(): void
}

export class FigureDialog {
    editor: Editor
    imageDB: EditorImageDB
    userImageDB: EditorImageDB
    imgId: number | false = false
    imgDb: "document" | "user" | false = false
    copyright: Record<string, JSONValue> | false = false
    insideFigure = false
    figureNode: Node | false = false
    contentNode: Node | false = false
    caption = true
    category = "none"
    aligned = "center"
    width = "50"
    equation = ""
    node: Node | null = null
    submitMessage = gettext("Insert")
    dialog: Dialog | false = false
    mathliveDOM!: HTMLElement
    nonMathElements: HTMLElement[] = []
    mathField: MathfieldElementInstance | false = false

    constructor(editor: Editor) {
        this.editor = editor
        this.imageDB = this.editor.mod.db!
            .imageDB as unknown as EditorImageDB
        this.userImageDB = this.editor.app.imageDB as unknown as EditorImageDB
    }

    layoutMathEditor(): void {
        const dialogEl = (this.dialog as Dialog).dialogEl
        const preview = dialogEl.querySelector(".inner-figure-preview")
        if (!preview) {
            return
        }
        preview.innerHTML = `<div><span class="math-field" type="text" name="math" ></span></div>
            <p class="formula-or-figure">${gettext("or")}</p>
            <p><button type="button" id="insert-figure-image" class="fw-button fw-light">
                ${gettext("Insert image")} <i class="fa-solid fa-image"></i>
            </button></p>`

        this.mathliveDOM = dialogEl.querySelector(".math-field") as HTMLElement
        this.nonMathElements = [
            dialogEl.querySelector("#insert-figure-image") as HTMLElement,
            dialogEl.querySelector(".formula-or-figure") as HTMLElement
        ]
        import("@fiduswriter/document/mathlive").then(MathLive => {
            const MathfieldElement = (
                MathLive as unknown as {MathfieldElement: MathfieldElementClass}
            ).MathfieldElement
            MathfieldElement.strings = {
                int: {
                    "keyboard.tooltip.functions": gettext("Functions"),
                    "keyboard.tooltip.greek": gettext("Greek Letters"),
                    "keyboard.tooltip.command": gettext("LaTeX Command Mode"),
                    "keyboard.tooltip.numeric": gettext("Numeric"),
                    "keyboard.tooltip.roman": gettext(
                        "Symbols and Roman Letters"
                    ),
                    "tooltip.copy to clipboard": gettext("Copy to Clipboard"),
                    "tooltip.redo": gettext("Redo"),
                    "tooltip.toggle virtual keyboard": gettext(
                        "Toggle Virtual Keyboard"
                    ),
                    "tooltip.undo": gettext("Undo")
                }
            }
            MathfieldElement.locale = "int"
            MathfieldElement.plonkSound = null
            MathfieldElement.keypressSound = null
            this.mathField = new (MathfieldElement as unknown as new (
                options: Record<string, unknown>
            ) => MathfieldElementInstance)({
                mathVirtualKeyboardPolicy: "manual"
            })
            this.mathField.value = this.equation
            this.mathliveDOM.appendChild(this.mathField)

            this.mathField.addEventListener("focusout", () =>
                this.showPlaceHolder()
            )
            this.mathField.addEventListener("focus", () =>
                this.hidePlaceHolder()
            )
            this.mathField.addEventListener("input", () => {
                this.equation = this.mathField
                    ? this.mathField.getValue()
                    : ""
                this.showHideNonMathElements()
            })
            this.mathField.select()
            this.mathField.value = this.equation

            this.showHideNonMathElements()
            dialogEl
                .querySelector("#insert-figure-image")!
                .addEventListener("click", () => this.selectImage())
        })
    }

    showPlaceHolder(): void {
        if (
            this.mathField &&
            !this.mathField.getValue().length &&
            !this.mathliveDOM.querySelector(".fw-placeholder")
        ) {
            this.mathliveDOM.insertAdjacentHTML(
                "beforeend",
                `<span class="fw-placeholder" >${gettext("Type formula")}</span>`
            )
        }
    }

    hidePlaceHolder(): void {
        const placeHolder = this.mathliveDOM.querySelector(".fw-placeholder")
        if (placeHolder) {
            this.mathliveDOM.removeChild(placeHolder)
        }
    }

    showHideNonMathElements(): void {
        if (this.equation.length) {
            this.nonMathElements.forEach(el => (el.style.display = "none"))
        } else {
            this.nonMathElements.forEach(el => (el.style.display = ""))
        }
    }

    selectImage(): void {
        const imageSelection = new ImageSelectionDialog(
            this.imageDB,
            this.userImageDB,
            this.imgId,
            this.editor
        )
        imageSelection
            .init()
            .then(
                ({
                    id,
                    db
                }: {
                    id: number | false
                    db: "document" | "user"
                }) => {
                    if (id) {
                        this.imgId = id
                        this.imgDb = db
                        // We take a copy of the object in case of the image coming from the user db in order
                        // not to overwrite the copyright info from the user's image db.
                        this.copyright =
                            db === "document"
                                ? (this.imageDB.db[String(id)].copyright as
                                      | Record<string, JSONValue>
                                      | undefined) || false
                                : JSON.parse(
                                      JSON.stringify(
                                          this.userImageDB.db[String(id)]
                                              .copyright
                                      )
                                  )
                        this.layoutImagePreview()
                    } else {
                        this.imgId = false
                        this.imgDb = false
                        this.layoutMathEditor()
                    }
                }
            )
    }

    async layoutImagePreview(): Promise<void> {
        if (this.imgId) {
            if (this.mathField) {
                this.mathField = false
            }
            const db =
                this.imgDb === "document"
                    ? this.imageDB.db
                    : this.userImageDB.db

            const imageEntry = db[String(this.imgId)]
            let imgSrc = String(imageEntry?.image || "")

            if (imageEntry?.file_type === "application/octet-stream") {
                const key = this.editor.e2ee?.key
                if (key) {
                    try {
                        imgSrc = await E2EEEncryptor.decryptImageToUrl(
                            String(imageEntry.image),
                            key,
                            String(imageEntry.original_file_type || "image/png")
                        )
                    } catch (_e) {
                        imgSrc = staticUrl("img/error.avif")
                    }
                } else {
                    imgSrc = staticUrl("img/error.avif")
                }
            }

            const dialogEl = (this.dialog as Dialog).dialogEl
            dialogEl.querySelector(
                ".inner-figure-preview"
            )!.innerHTML = `<img src="${imgSrc}" style="max-width: 400px;max-height:220px">
                <span class="dot-menu-icon"><i class="fa-solid fa-ellipsis-v"></i></span>`

            dialogEl
                .querySelector(".dot-menu-icon")!
                .addEventListener("click", event => {
                    const contentMenu = new ContentMenu({
                        menu: this.editor.menu.imageMenuModel as ContentMenuInit,
                        page: this,
                        menuPos: {
                            X: (event as MouseEvent).pageX,
                            Y: (event as MouseEvent).pageY
                        }
                    })
                    contentMenu.open()
                })
        }
    }

    async submitForm(): Promise<boolean> {
        if (new RegExp(/^\s*$/).test(this.equation) && !this.imgId) {
            // The math input is empty. Delete a math node if it exist. Then close the dialog.
            if (this.insideFigure) {
                const tr = this.editor.currentView.state.tr.deleteSelection()
                this.editor.currentView.dispatch(tr)
            }
            ;(this.dialog as Dialog).close()
            return false
        }

        if (this.imgDb === "user") {
            if (this.editor.e2ee?.encrypted) {
                // For E2EE: encrypt the user image and upload it to the document
                const userImage = this.userImageDB.db[String(this.imgId)]
                try {
                    const response = await fetch(String(userImage.image))
                    const blob = await response.blob()
                    const file = new File(
                        [blob],
                        String(userImage.image).split("/").pop() || "image",
                        {type: blob.type}
                    )
                    const key = this.editor.e2ee.key
                    if (!key) {
                        throw new Error("E2EE key missing")
                    }
                    const encryptedFile = await E2EEEncryptor.encryptImage(
                        file,
                        key
                    )
                    const encryptedCopyright =
                        await E2EEEncryptor.encryptObject(
                            this.copyright,
                            key
                        )
                    const newId = await this.imageDB.saveImage({
                        image: encryptedFile,
                        title: userImage.title,
                        copyright: encryptedCopyright,
                        checksum: userImage.checksum,
                        original_file_type: blob.type,
                        cats: []
                    })
                    this.imgId = newId
                    this.imgDb = "document"
                } catch (error) {
                    console.error("E2EE: Failed to encrypt user image", error)
                    addAlert("error", gettext("Could not encrypt image"))
                    return false
                }
            } else {
                // Add image to document db.
                const imageEntry = JSON.parse(
                    JSON.stringify(this.userImageDB.db[String(this.imgId)])
                ) as Record<string, unknown>
                imageEntry.copyright = this.copyright
                this.imageDB.setImage(this.imgId as number, imageEntry)
                this.imgDb = "document"
            }
        } else if (
            this.imgId &&
            this.imageDB.db[String(this.imgId)] &&
            !deepEqual(
                this.copyright,
                this.imageDB.db[String(this.imgId)].copyright
            )
        ) {
            const imageEntry = JSON.parse(
                JSON.stringify(this.imageDB.db[String(this.imgId)])
            ) as Record<string, unknown>
            imageEntry.copyright = this.copyright
            this.imageDB.setImage(this.imgId as number, imageEntry)
        }

        const node = this.node
        const currentEquationNode = node
            ? node.content.content.find(
                  (node: Node) => node.type.name === "figure_equation"
              )
            : undefined
        const currentImageNode = node
            ? node.content.content.find(
                  (node: Node) => node.type.name === "image"
              )
            : undefined

        if (
            node &&
            this.insideFigure &&
            this.equation ===
                (currentEquationNode?.attrs.equation || "") &&
            this.imgId ===
                (currentImageNode?.attrs.image || false) &&
            this.imgDb === "document" &&
            this.caption === node.attrs.caption &&
            this.category === node.attrs.category &&
            this.aligned === node.attrs.aligned &&
            this.width === node.attrs.width
        ) {
            // The figure has not been changed, just close the dialog
            ;(this.dialog as Dialog).close()
            return false
        }
        const content: Node[] = []
        if (this.imgId) {
            content.push(
                this.editor.currentView.state.schema.nodes["image"].create({
                    image: this.imgId
                })
            )
        } else {
            content.push(
                this.editor.currentView.state.schema.nodes[
                    "figure_equation"
                ].create({
                    equation: this.equation
                })
            )
        }
        const captionNode =
            node?.content?.content.find(
                (node: Node) => node.type.name === "figure_caption"
            ) ||
            this.editor.currentView.state.schema.nodes["figure_caption"].create()
        if (this.category === "table") {
            content.unshift(captionNode)
        } else {
            content.push(captionNode)
        }
        const tr = this.editor.currentView.state.tr.replaceSelectionWith(
            this.editor.currentView.state.schema.nodes["figure"].createAndFill(
                {
                    aligned: this.aligned,
                    width: this.width,
                    category: this.category,
                    caption: this.caption,
                    id: node ? node.attrs.id : randomFigureId()
                },
                content
            )!,
            false
        )
        this.editor.currentView.dispatch(tr)

        ;(this.dialog as Dialog).close()
        return true
    }

    findFigure(state: {
        selection: {node?: Node; $head: {depth: number; node(d: number): Node}}
    }): Node | null {
        if (
            state.selection.node &&
            state.selection.node.type.name == "figure"
        ) {
            return state.selection.node
        }
        const $head = state.selection.$head
        for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type.name == "figure") {
                return $head.node(d)
            }
        }
        return null
    }

    init(): boolean {
        this.node = this.findFigure(this.editor.currentView.state)
        const node = this.node

        if (
            node?.attrs?.track?.find(
                (track: {type: string}) => track.type === "deletion"
            )
        ) {
            // The figure is marked as deleted so we don't allow editing it.
            return true
        }

        const buttons: {
            text?: string
            classes?: string
            click?: () => void
            type?: "cancel" | "close" | "ok"
        }[] = []

        if (node?.type && node.type.name === "figure") {
            this.insideFigure = true
            this.submitMessage = gettext("Update")
            this.equation =
                node.content.content.find(
                    (childNode: Node) => childNode.type.name === "figure_equation"
                )?.attrs.equation || ""
            this.imgId =
                node.content.content.find(
                    (childNode: Node) => childNode.type.name === "image"
                )?.attrs.image || false
            this.imgDb = "document"
            this.category = node.attrs.category
            this.caption = node.attrs.caption
            this.aligned = node.attrs.aligned
            this.width = node.attrs.width
            buttons.push({
                text: gettext("Remove"),
                classes: "fw-orange",
                click: () => {
                    const tr =
                        this.editor.currentView.state.tr.deleteSelection()
                    this.editor.currentView.dispatch(tr)
                    ;(this.dialog as Dialog).close()
                }
            })
        }
        // Image positioning both at the time of updating and inserting for the first time
        buttons.push({
            // Update
            text: this.submitMessage,
            classes: "fw-dark",
            click: () => this.submitForm()
        })

        buttons.push({
            type: "cancel"
        })

        this.dialog = new Dialog({
            id: "figure-dialog",
            title: gettext("Enter latex math or insert an image"),
            body: configureFigureTemplate({
                language: this.editor.view.state.doc.attrs.language
            }),
            buttons,
            beforeClose: () => {
                if (this.mathField) {
                    this.mathField = false
                }
                if (window.mathVirtualKeyboard) {
                    window.mathVirtualKeyboard.hide()
                }
            },
            onClose: () => this.editor.currentView.focus(),
            restoreActiveElement: false
        })

        this.dialog.open()

        const alignmentSelector = dropdownSelect(
            (this.dialog as Dialog).dialogEl.querySelector(
                ".figure-alignment"
            ) as HTMLSelectElement,
            {
                onChange: newValue => {
                    this.aligned = String(newValue)
                },
                width: "80%",
                value: this.aligned
            }
        )

        if (this.width === "100") {
            alignmentSelector?.setValue("center")
            alignmentSelector?.disable()
            this.aligned = "center"
        }

        const dialogEl = (this.dialog as Dialog).dialogEl
        const figureWidthDOM = dialogEl.querySelector(
            ".figure-width"
        ) as HTMLElement
        figureWidthDOM.style.width = "80%"
        const widthLabel = figureWidthDOM.firstElementChild as HTMLElement
        widthLabel.innerText = `${this.width} %`
        figureWidthDOM.addEventListener("click", event => {
            const contentMenu = new ContentMenu({
                menu: this.editor.menu.figureWidthMenuModel as ContentMenuInit,
                page: this,
                menuPos: {
                    X: (event as MouseEvent).pageX,
                    Y: (event as MouseEvent).pageY
                },
                onClose: () => {
                    if (this.width == "100") {
                        alignmentSelector?.setValue("center")
                        alignmentSelector?.disable()
                        this.aligned = "center"
                    } else {
                        alignmentSelector?.enable()
                    }
                }
            })
            contentMenu.open()
        })

        dropdownSelect(
            dialogEl.querySelector(".figure-category") as HTMLSelectElement,
            {
                onChange: newValue => {
                    this.category = String(newValue)
                },
                width: "80%",
                value: this.category
            }
        )

        dropdownSelect(
            dialogEl.querySelector(".figure-caption") as HTMLSelectElement,
            {
                onChange: newValue => {
                    this.caption = newValue === "true"
                },
                width: "80%",
                value: String(this.caption)
            }
        )

        if (this.imgId && this.imageDB.db[String(this.imgId)]) {
            this.copyright = (this.imageDB.db[String(this.imgId)].copyright as
                | Record<string, JSONValue>
                | undefined) || false
            this.layoutImagePreview()
        } else {
            this.layoutMathEditor()
        }

        return false
    }
}
