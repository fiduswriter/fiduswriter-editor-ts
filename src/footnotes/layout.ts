import fastdom from "fastdom"

import {getFootnoteMarkers} from "../state_plugins/index.js"
import type {Editor} from "../types.js"

const fastdomImpl = fastdom as any

interface FootnoteMarker {
    from: number
    to: number
}

/* A class to make footnotes appear correctly off the side of their referrer. */
export class ModFootnoteLayout {
    mod: {
        editor: Editor
        [key: string]: any
    }
    editor: Editor

    constructor(mod: {editor: Editor; [key: string]: any}) {
        mod.layout = this
        this.mod = mod
        this.editor = mod.editor
    }

    init(): void {
        // Add two elements to hold dynamic CSS info about comments.
        const styleContainers = document.createElement("temp")
        styleContainers.innerHTML =
            '<style type="text/css" id="footnote-placement-style"></style>'
        while (styleContainers.firstElementChild) {
            document.body.appendChild(styleContainers.firstElementChild)
        }
    }

    updateDOM(): void {
        // Handle the CSS layout of the footnotes on the screen.
        // DOM write phase - nothing to do.
        fastdomImpl.measure(() => {
            // DOM read phase
            const footnoteBoxes = document.querySelectorAll(
                    "#footnote-box-container .footnote-container"
                ),
                referrers = getFootnoteMarkers(this.editor.view.state)
            if (
                (!referrers.length &&
                    (this.editor.mod.citations as any).citationType !==
                        "note") ||
                referrers.length !== footnoteBoxes.length
            ) {
                // Apparently not all footnote boxes have been drawn or there are none. Abort for now.
                return
            }
            const footnoteBoxContainer = document.getElementById(
                "footnote-box-container"
            )
            if (!footnoteBoxContainer) {
                return
            }
            let footnotePlacementStyle = ""

            if (getComputedStyle(footnoteBoxContainer).display === "block") {
                // We are in mobile/tablet mode. We don't need to place footnotes.
            } else if (
                (this.editor.mod.citations as any).citationType === "note"
            ) {
                const totalOffset =
                    footnoteBoxContainer.getBoundingClientRect().top
                /* Citations are also in footnotes, so both citation footnotes
                 * and editor footnotes have to be placed. They should be placed
                 * in the order the markers appear in the content, even though
                 * editor footnotes and citations footnotes are separated in the DOM.
                 */
                const citationFootnotes = document.querySelectorAll(
                    "#citation-footnote-box-container .footnote-citation"
                )
                let editorFootnoteIndex = 0,
                    citationFootnoteIndex = 0,
                    totalEditorOffset = totalOffset,
                    totalCitationOffset = totalOffset
                this.editor.view.state.doc.descendants((node, pos) => {
                    if (
                        node.isInline &&
                        (node.type.name === "footnote" ||
                            node.type.name === "citation")
                    ) {
                        let topMargin = 10
                        if (node.type.name === "footnote") {
                            const footnoteBox =
                                    footnoteBoxes[editorFootnoteIndex],
                                selector = `.footnote-container:nth-of-type(${editorFootnoteIndex + 1})`,
                                footnoteBoxCoords =
                                    footnoteBox.getBoundingClientRect(),
                                footnoteBoxHeight = footnoteBoxCoords.height,
                                referrerTop =
                                    this.editor.view.coordsAtPos(pos).top
                            editorFootnoteIndex++
                            if (!referrerTop) {
                                // footnote is not shown. Also hide the footnote from the editor.
                                footnotePlacementStyle += `${selector} {display: none;}\n`
                                return
                            }
                            if (
                                referrerTop > totalEditorOffset ||
                                totalEditorOffset <
                                    totalCitationOffset + topMargin
                            ) {
                                topMargin = Math.max(
                                    referrerTop - totalEditorOffset,
                                    totalCitationOffset -
                                        totalEditorOffset +
                                        topMargin
                                )
                                footnotePlacementStyle += `${selector} {margin-top: ${topMargin}px;}\n`
                            }
                            totalEditorOffset += footnoteBoxHeight + topMargin
                        } else {
                            if (
                                citationFootnotes.length > citationFootnoteIndex
                            ) {
                                const footnoteBox =
                                        citationFootnotes[citationFootnoteIndex],
                                    selector =
                                        ".footnote-citation:nth-of-type(" +
                                        (citationFootnoteIndex + 1) +
                                        ")",
                                    footnoteBoxCoords =
                                        footnoteBox.getBoundingClientRect(),
                                    footnoteBoxHeight =
                                        footnoteBoxCoords.height,
                                    referrerTop =
                                        this.editor.view.coordsAtPos(
                                            pos
                                        ).top
                                citationFootnoteIndex++
                                if (!referrerTop) {
                                    // footnote is not shown. Also hide the footnote from the editor.
                                    footnotePlacementStyle += `${selector} {display: none;}\n`
                                    return
                                }
                                if (
                                    referrerTop > totalCitationOffset ||
                                    totalCitationOffset <
                                        totalEditorOffset + topMargin
                                ) {
                                    topMargin = Math.max(
                                        referrerTop - totalCitationOffset,
                                        topMargin +
                                            totalEditorOffset -
                                            totalCitationOffset
                                    )
                                    footnotePlacementStyle += `${selector} {margin-top: ${topMargin}px;}\n`
                                }
                                totalCitationOffset +=
                                    footnoteBoxHeight + topMargin
                            }
                        }
                    }
                })
            } else {
                let totalOffset =
                    footnoteBoxContainer.getBoundingClientRect().top
                /* Only editor footnotes (no citation footnotes) need to be layouted.
                 * We use the existing footnote markers referrers to find the
                 * placement.
                 */
                referrers.forEach((referrer: FootnoteMarker, index: number) => {
                    const footnoteBox = footnoteBoxes[index]

                    const footnoteBoxCoords =
                            footnoteBox.getBoundingClientRect(),
                        footnoteBoxHeight = footnoteBoxCoords.height,
                        referrerTop = this.editor.view.coordsAtPos(
                            referrer.from
                        ).top,
                        selector = `.footnote-container:nth-of-type(${index + 1})`
                    if (!referrerTop) {
                        // footnote is not shown. Also hide the footnote from the editor.
                        footnotePlacementStyle += `${selector} {display: none;}\n`
                        return
                    }
                    let topMargin = 10

                    if (referrerTop > totalOffset) {
                        topMargin = referrerTop - totalOffset
                        footnotePlacementStyle += `${selector} {margin-top: ${topMargin}px;}\n`
                    }
                    totalOffset += footnoteBoxHeight + topMargin
                })
            }

            fastdomImpl.mutate(() => {
                //DOM write phase
                const placementStyleEl = document.getElementById(
                    "footnote-placement-style"
                )
                if (
                    placementStyleEl &&
                    placementStyleEl.innerHTML != footnotePlacementStyle
                ) {
                    placementStyleEl.innerHTML = footnotePlacementStyle
                }
            })
        })
    }
}
