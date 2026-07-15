import {FormatCitations} from "@fiduswriter/document/citations/format"
import type {BibDB, CSL} from "@fiduswriter/document"

interface CitationInfo {
    format: string
    references: Array<{
        id: number
        [key: string]: unknown
    }>
}

/**
 * Render citations into the DOM.
 */

export class RenderCitations {
    contentElement: HTMLElement
    citationStyle: string
    bibliographyHeader: string
    bibDB: BibDB
    csl: CSL
    synchronous: boolean
    lang: string
    allCitationNodes: NodeListOf<HTMLElement>
    allCitationInfos: CitationInfo[]
    fm: FormatCitations | false

    constructor(
        contentElement: HTMLElement,
        citationStyle: string,
        bibliographyHeader: string,
        bibDB: BibDB,
        csl: CSL,
        synchronous = false,
        lang = "en-US"
    ) {
        this.contentElement = contentElement
        this.citationStyle = citationStyle
        this.bibliographyHeader = bibliographyHeader
        this.bibDB = bibDB
        this.csl = csl
        this.synchronous = synchronous
        this.lang = lang

        this.allCitationNodes = document.querySelectorAll("span.citation")
        this.allCitationInfos = []
        this.fm = false
    }

    init(): boolean | Promise<void> {
        this.allCitationNodes =
            this.contentElement.querySelectorAll("span.citation")
        this.allCitationNodes.forEach(cElement => {
            const citeInfo: CitationInfo = {
                format: cElement.dataset.format || "",
                references: JSON.parse(cElement.dataset.references || "[]")
            }
            this.allCitationInfos.push(citeInfo)
        })
        this.fm = new FormatCitations(
            this.csl,
            this.allCitationInfos,
            this.citationStyle,
            this.bibliographyHeader,
            this.bibDB,
            this.synchronous,
            this.lang
        )
        if (this.synchronous) {
            if (!this.fm.init()) {
                return false
            }
            this.renderCitations()
            return true
        } else {
            const initResult = this.fm.init()
            if (initResult instanceof Promise) {
                return initResult.then(() => {
                    this.renderCitations()
                    return Promise.resolve()
                })
            }
            this.renderCitations()
            return Promise.resolve()
        }
    }

    renderCitations(): void {
        if (this.fm && "note" !== this.fm.citationType) {
            this.fm.citationTexts.forEach(
                (citationText, index) =>
                    (this.allCitationNodes[index].innerHTML = citationText)
            )
        }
    }
}
