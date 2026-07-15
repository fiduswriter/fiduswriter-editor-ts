import {FidusWriterPasteHandler} from "./fidus_writer.js"
import {GeneralPasteHandler} from "./general.js"
import {GoogleDocsPasteHandler} from "./google_docs.js"
import {LibreOfficeWriterPasteHandler} from "./libreoffice_writer.js"
import {MicrosoftWordPasteHandler} from "./microsoft_word.js"

import {resetPasteRange} from "../../state_plugins/clipboard.js"
import type {Editor} from "../../types.js"

// Some pasted HTML will need slight conversions to work correctly.
// We try to sniff whether paste comes from MsWord, LibreOffice or Google Docs
// and use specialized handlers for these and a general handler everything else.

export class HTMLPaste {
    editor: Editor
    inHTML: string
    pmType: string
    view: import("prosemirror-view").EditorView
    htmlDoc: HTMLElement | undefined
    handler:
        | typeof FidusWriterPasteHandler
        | typeof GeneralPasteHandler
        | typeof GoogleDocsPasteHandler
        | typeof LibreOfficeWriterPasteHandler
        | typeof MicrosoftWordPasteHandler
    handlerInstance: GeneralPasteHandler
    outHTML: string

    constructor(
        editor: Editor,
        inHTML: string,
        pmType: string,
        view: import("prosemirror-view").EditorView
    ) {
        this.editor = editor
        this.inHTML = inHTML
        this.pmType = pmType
        this.view = view
        this.htmlDoc = undefined
        this.handler = GeneralPasteHandler
        this.handlerInstance = new GeneralPasteHandler(editor, document.createElement("html"), pmType)
        this.outHTML = ""
    }

    getOutput(): string {
        this.parseHTML()
        this.selectHandler()
        this.handlerInstance = new this.handler(
            this.editor,
            this.htmlDoc as HTMLElement,
            this.pmType
        )
        this.outHTML = this.handlerInstance.getOutput()
        setTimeout(() => {
            this.resetPasteRange()
        }, 0)
        return this.outHTML
    }

    parseHTML(): void {
        const parser = new window.DOMParser()
        this.htmlDoc = parser
            .parseFromString(this.inHTML, "text/html")
            .getElementsByTagName("html")[0]
    }

    // Find out what the source of the paste is and choose a corresponding
    // handler.
    selectHandler(): void {
        if (!this.htmlDoc) {
            return
        }
        // For LibreOffice
        const head = this.htmlDoc.getElementsByTagName("head")[0]
        const generatorMetaTag = head.querySelector("meta[name=generator]") as HTMLMetaElement | null
        // For Google Docs
        const body = this.htmlDoc.getElementsByTagName("body")[0]
        const firstB = body.querySelector("b") as HTMLElement | null
        // For Fidus Writer
        const pmSlice = this.htmlDoc.querySelector("[data-pm-slice]")
        if (
            this.htmlDoc.hasAttribute("xmlns:w") &&
            this.htmlDoc.getAttribute("xmlns:w") ===
                "urn:schemas-microsoft-com:office:word"
        ) {
            this.handler = MicrosoftWordPasteHandler
        } else if (generatorMetaTag?.content?.startsWith("LibreOffice")) {
            this.handler = LibreOfficeWriterPasteHandler
        } else if (firstB?.id.startsWith("docs-internal-guid")) {
            this.handler = GoogleDocsPasteHandler
        } else if (pmSlice) {
            this.handler = FidusWriterPasteHandler
        } else {
            this.handler = GeneralPasteHandler
        }
    }

    resetPasteRange(): void {
        const tr = this.view.state.tr
        resetPasteRange(tr)
        this.view.dispatch(tr)
    }
}
