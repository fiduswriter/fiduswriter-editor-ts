import {GeneralPasteHandler} from "./general.js"

// LibreOffice Writer paste handler
export class LibreOfficeWriterPasteHandler extends GeneralPasteHandler {
    // Convert an existing node to a different node, if needed.
    convertNode(node: HTMLElement) {
        node = super.convertNode(node)
        // Footnote markers (only in main pm instance):
        if (
            node.tagName === "A" &&
            node.classList.contains("sdfootnoteanc") &&
            this.pmType === "main"
        ) {
            // Remove "sym" at the end of the selector
            const href = node.getAttribute("href") || ""
            const fnSelector =
                href.length > 3 ? href.substring(0, href.length - 3) : href
            const footnote = this.dom.querySelector(fnSelector) as HTMLElement | null
            if (footnote) {
                const footnoteCounter =
                    footnote.querySelector("a.sdfootnotesym")
                if (footnoteCounter) {
                    footnoteCounter.parentNode?.removeChild(footnoteCounter)
                }
                this.footnoteMarkers.push(node)
                this.footnotes.push(footnote)
            }
        }

        return node
    }
}
