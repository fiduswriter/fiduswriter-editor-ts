import { FormatCitations } from "@fiduswriter/document/citations/format";
/**
 * Render citations into the DOM.
 */
export class RenderCitations {
    contentElement;
    citationStyle;
    bibliographyHeader;
    bibDB;
    csl;
    synchronous;
    lang;
    allCitationNodes;
    allCitationInfos;
    fm;
    constructor(contentElement, citationStyle, bibliographyHeader, bibDB, csl, synchronous = false, lang = "en-US") {
        this.contentElement = contentElement;
        this.citationStyle = citationStyle;
        this.bibliographyHeader = bibliographyHeader;
        this.bibDB = bibDB;
        this.csl = csl;
        this.synchronous = synchronous;
        this.lang = lang;
        this.allCitationNodes = document.querySelectorAll("span.citation");
        this.allCitationInfos = [];
        this.fm = false;
    }
    init() {
        this.allCitationNodes =
            this.contentElement.querySelectorAll("span.citation");
        this.allCitationNodes.forEach(cElement => {
            const citeInfo = {
                format: cElement.dataset.format || "",
                references: JSON.parse(cElement.dataset.references || "[]")
            };
            this.allCitationInfos.push(citeInfo);
        });
        this.fm = new FormatCitations(this.csl, this.allCitationInfos, this.citationStyle, this.bibliographyHeader, this.bibDB, this.synchronous, this.lang);
        if (this.synchronous) {
            if (!this.fm.init()) {
                return false;
            }
            this.renderCitations();
            return true;
        }
        else {
            const initResult = this.fm.init();
            if (initResult instanceof Promise) {
                return initResult.then(() => {
                    this.renderCitations();
                    return Promise.resolve();
                });
            }
            this.renderCitations();
            return Promise.resolve();
        }
    }
    renderCitations() {
        if (this.fm && "note" !== this.fm.citationType) {
            this.fm.citationTexts.forEach((citationText, index) => (this.allCitationNodes[index].innerHTML = citationText));
        }
    }
}
//# sourceMappingURL=render.js.map