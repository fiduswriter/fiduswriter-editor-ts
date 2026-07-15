import {GeneralPasteHandler} from "./general.js"

// Microsoft Word 2016 paste handler
export class MicrosoftWordPasteHandler extends GeneralPasteHandler {
    // Remove unused content
    cleanDOM(): void {
        // Remove footnote list container with separator line
        const removableElements = this.dom.querySelectorAll(
            'div[style*="mso-element:footnote-list"]'
        )

        removableElements.forEach(el => el.parentNode?.removeChild(el))
    }

    // Iterate over pasted nodes and their children
    iterateNode(node: ChildNode): boolean {
        node = super.convertNode(node as HTMLElement)
        if ((node as HTMLElement).tagName === "P" && !node.firstChild) {
            node.parentNode?.removeChild(node)
            return true
        } else if (node.nodeType === 8) {
            if (node.textContent === "EndFragment") {
                // End of paste content. Remove all remaining sibling nodes.
                while (node) {
                    const nextSibling = node.nextSibling
                    node.parentNode?.removeChild(node)
                    node = nextSibling as ChildNode
                }
                return false
            } else {
                node.parentNode?.removeChild(node)
                return true
            }
        }
        if (node.nodeType === 1) {
            let childNode = node.firstChild
            while (childNode) {
                const nextChildNode = childNode.nextSibling
                if (this.iterateNode(childNode)) {
                    childNode = nextChildNode
                } else {
                    childNode = null
                }
            }
            node = this.convertNode(node as HTMLElement)
        }

        return true
    }

    // Convert an existing node to a different node, if needed.
    convertNode(node: HTMLElement): HTMLElement {
        // Footnote markers (only in main pm instance):
        if (
            node.tagName === "A" &&
            node.firstChild?.nodeType === 1 &&
            (node.firstChild as HTMLElement).tagName === "SPAN" &&
            (node.firstChild as HTMLElement).classList.contains(
                "MsoFootnoteReference"
            ) &&
            this.pmType === "main"
        ) {
            // Remove "#_ftn" from the selector (#_ftn1)
            const fnSelector = node.getAttribute("href") || ""
            const fnNumber = fnSelector.substring(5, fnSelector.length)
            const footnote = this.dom.querySelector("#ftn" + fnNumber)
            if (footnote) {
                const footnoteCounter = footnote.querySelector(
                    'a[href="#_ftnref' + fnNumber + '"]'
                )
                if (footnoteCounter) {
                    footnoteCounter.parentNode?.removeChild(footnoteCounter)
                    const followingNode = footnoteCounter.nextSibling
                    if (followingNode?.nodeType === 3) {
                        // If there is a text string right after the footnote
                        // marker, remove any leading spaces.
                        followingNode.nodeValue =
                            followingNode.nodeValue?.replace(/^\s+/, "") || ""
                    }
                }
                this.footnoteMarkers.push(node)
                this.footnotes.push(footnote as HTMLElement)
            }
        }

        return node
    }
}
