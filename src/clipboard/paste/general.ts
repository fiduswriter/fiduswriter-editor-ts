import type {Editor} from "../../types.js"

// General Fallback handler for paste
export class GeneralPasteHandler {
    editor: Editor
    htmlDoc: HTMLElement
    pmType: string
    footnoteMarkers: HTMLElement[]
    footnotes: HTMLElement[]
    dom: HTMLElement
    inHTML: string
    outHTML: string

    constructor(editor: Editor, htmlDoc: HTMLElement, pmType: string) {
        this.editor = editor
        this.htmlDoc = htmlDoc
        this.pmType = pmType
        this.footnoteMarkers = []
        this.footnotes = []
        this.dom = document.createElement("body")
        this.inHTML = ""
        this.outHTML = ""
    }

    // Iterate over each node in the body of the pasted content.
    getOutput(): string {
        this.dom = this.htmlDoc.getElementsByTagName("body")[0]
        this.inHTML = this.dom.innerHTML
        this.iterateNode(this.dom)
        this.cleanDOM()
        this.convertFootnotes()
        this.outHTML = this.dom.innerHTML
        return this.outHTML
    }

    // Remove unused content
    cleanDOM(): void {}

    // Iterate over pasted nodes and their children
    iterateNode(node: ChildNode): boolean {
        if ((node as HTMLElement).tagName === "P" && !node.firstChild) {
            node.parentNode?.removeChild(node)
            return true
        } else if (node.nodeType === 8) {
            // comment node
            node.parentNode?.removeChild(node)
            return true
        } else if (node.nodeType === 1) {
            // element node
            let childNode = node.firstChild
            while (childNode) {
                const nextChildNode = childNode.nextSibling
                this.iterateNode(childNode)
                childNode = nextChildNode
            }
            node = this.convertNode(node as HTMLElement)
        }
        return true
    }

    // Convert an existing node to a different node, if needed.
    convertNode(node: HTMLElement): HTMLElement {
        if (
            node.tagName === "TABLE" &&
            node.firstElementChild?.tagName !== "CAPTION"
        ) {
            const caption = document.createElement("caption")
            caption.innerHTML = "<span class='text'></span>"
            node.insertBefore(caption, node.firstChild)
        }
        return node
    }

    // Move footnotes into their markers and turn footnote markers into the
    // required format.
    convertFootnotes(): void {
        this.footnoteMarkers.forEach((fnM, index) => {
            const footnote = this.footnotes[index]
            const newFnM = document.createElement("span")
            newFnM.classList.add("footnote-marker")
            const footnoteContents = footnote.innerHTML.replace(/\s+/g, " ")
            // Remove linebreaks in string (not <BR>)
            // Turn multiple white spaces into single space
            newFnM.dataset.footnote = footnoteContents
            fnM.parentNode?.replaceChild(newFnM, fnM)
        })
        // Remove all footnotes from document. Some footnotes may have several
        // markers, so only remove each footnote once.
        this.footnotes.forEach(fn => {
            if (fn.parentNode) {
                fn.parentNode.removeChild(fn)
            }
        })
    }
}
