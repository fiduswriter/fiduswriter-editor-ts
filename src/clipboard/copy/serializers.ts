import {BIBLIOGRAPHY_HEADERS} from "@fiduswriter/document/schema/i18n"
import type {Fragment, Schema} from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"

import {RenderCitations} from "../../citations/render.js"
import {createDocCopySchema, fnCopySchema} from "./schema.js"
import type {Editor} from "../../types.js"

// Wrap around DOMSerializer, allowing post processing.
class ClipboardDOMSerializer {
    domSerializer: DOMSerializer
    editor: Editor

    constructor(nodes: Record<string, any>, marks: Record<string, any>, editor: Editor) {
        this.domSerializer = new DOMSerializer(nodes, marks)
        this.editor = editor
    }

    serializeFragment(fragment: Fragment, options?: {document?: Document}): DocumentFragment {
        const domFragment = this.domSerializer.serializeFragment(
            fragment,
            options
        )
        return this.postProcessFragment(domFragment as DocumentFragment)
    }

    postProcessFragment(domFragment: DocumentFragment): DocumentFragment {
        const citationFormatter = this.renderCitations(domFragment)
        this.renderFootnotes(domFragment, citationFormatter)
        this.removeTrackingData(domFragment)
        this.addBaseUrlToImages(domFragment)
        this.addFigureNumbers(domFragment)
        return domFragment
    }

    renderCitations(domFragment: DocumentFragment): any {
        const settings = this.editor.view.state.doc.attrs as Record<string, any>,
            bibliographyHeader =
                settings.bibliography_header[settings.language] ||
                (BIBLIOGRAPHY_HEADERS as any)[settings.language]
        const citRenderer = new RenderCitations(
            domFragment as any,
            settings.citationstyle,
            bibliographyHeader,
            (this.editor.mod.db as any).bibDB,
            this.editor.app.csl,
            true // synchronous. Should work as the editor has used the same style previously.
        )
        if (citRenderer.init()) {
            const fm = citRenderer.fm as any
            if (fm.bibHTML.length) {
                const bibDiv = document.createElement("div")
                bibDiv.classList.add("fiduswriter-clipboard-bibliography")
                bibDiv.innerHTML = fm.bibHTML
                ;(bibDiv.firstElementChild as HTMLElement).innerHTML = gettext(
                    "Bibliography"
                )
                domFragment.appendChild(bibDiv)
            }
            return fm
        } else {
            return false
        }
    }

    renderFootnotes(domFragment: DocumentFragment, citationFormatter: any): void {
        const footnoteSelector =
            citationFormatter && citationFormatter.citationType === "note"
                ? ".footnote-marker, .citation"
                : ".footnote-marker"
        // Inside of footnote markers add anchors and put footnotes with content
        // at the back of the document.
        // Also, link the footnote anchor with the footnote.
        const footnotes = domFragment.querySelectorAll(footnoteSelector)
        const footnotesContainer = document.createElement("section")
        let citationCount = 0
        footnotesContainer.setAttribute("role", "doc-footnotes")
        footnotesContainer.classList.add("fnlist")
        footnotesContainer.classList.add("fiduswriter-clipboard-footnotes")
        footnotes.forEach((footnote, index) => {
            const counter = index + 1,
                id = this.getRandomID()
            const footnoteAnchor = this.getFootnoteAnchor(counter, id)
            footnote.appendChild(footnoteAnchor)
            const newFootnote = document.createElement("h6") // We use H6 as Wordpress Gutenberg only allows IDs on H1-6 elements.
            newFootnote.setAttribute("role", "doc-footnote")
            newFootnote.innerHTML = footnote.matches(".footnote-marker")
                ? (footnote as HTMLElement).dataset.footnote || ""
                : `<p>${citationFormatter.citationTexts[citationCount++] || " "}</p>`
            if (
                newFootnote.firstElementChild &&
                newFootnote.firstElementChild.matches("p")
            ) {
                ;(newFootnote.firstElementChild as HTMLElement).insertAdjacentHTML(
                    "afterbegin",
                    `${counter}. `
                )
            } else {
                newFootnote.insertAdjacentHTML(
                    "afterbegin",
                    `<p>${counter}. </p>`
                )
            }
            newFootnote.id = `fn-${id}`
            footnotesContainer.appendChild(newFootnote)
        })
        if (footnotes.length) {
            domFragment.appendChild(footnotesContainer)
        }
    }

    addFigureNumbers(domFragment: DocumentFragment): void {
        domFragment
            .querySelectorAll(
                "figure[data-category='figure'] figcaption span.label"
            )
            .forEach((el, index) => {
                ;(el as HTMLElement).innerHTML +=
                    " " + (index + 1) + ": "
            })

        domFragment
            .querySelectorAll(
                "figure[data-category='photo'] figcaption span.label"
            )
            .forEach((el, index) => {
                ;(el as HTMLElement).innerHTML +=
                    " " + (index + 1) + ": "
            })

        domFragment
            .querySelectorAll(
                "figure[data-category='table'] figcaption span.label"
            )
            .forEach((el, index) => {
                ;(el as HTMLElement).innerHTML +=
                    " " + (index + 1) + ": "
            })
    }

    addBaseUrlToImages(domFragment: DocumentFragment): void {
        domFragment
            .querySelectorAll("img")
            .forEach(el => el.setAttribute("src", el.src))
    }

    getRandomID(): string {
        return (0 | (Math.random() * 9e6)).toString(36)
    }

    getFootnoteAnchor(counter: number, id: string): HTMLElement {
        const footnoteAnchor = document.createElement("a")
        footnoteAnchor.setAttribute("href", `#fn-${id}`)
        footnoteAnchor.classList.add("fn")
        footnoteAnchor.classList.add("sdfootnoteanc")
        footnoteAnchor.innerHTML = `<sup>${counter}</sup>`
        return footnoteAnchor
    }

    removeTrackingData(domFragment: DocumentFragment): void {
        domFragment
            .querySelectorAll(".approved-insertion, .insertion")
            .forEach(el => {
                const parent = el.parentNode as any
                const fragment = document.createDocumentFragment()
                while (el.firstChild) {
                    fragment.appendChild(el.firstChild)
                }
                parent.replaceChild(fragment, el)
            })
        domFragment
            .querySelectorAll(".deletion")
            .forEach(el => el.parentElement!.removeChild(el))
    }

    static fromSchema(schema: Schema, editor: Editor): ClipboardDOMSerializer {
        return new ClipboardDOMSerializer(
            DOMSerializer.nodesFromSchema(schema),
            DOMSerializer.marksFromSchema(schema),
            editor
        )
    }
}

export const docClipboardSerializer = (editor: Editor): ClipboardDOMSerializer =>
    ClipboardDOMSerializer.fromSchema(
        createDocCopySchema(editor.schema) as Schema,
        editor
    )
export const fnClipboardSerializer = (editor: Editor): ClipboardDOMSerializer =>
    ClipboardDOMSerializer.fromSchema(fnCopySchema as Schema, editor)
