/**
 * Text extraction for the spell/grammar checker, ported from the old
 * languagetool plugin: per-section text "sources" with a position map
 * from text offset → ProseMirror position. Citations are substituted
 * with their formatted text (marked as untranslatable) and tracked
 * deletions are excluded, exactly like the old plugin's `getText`.
 */

import type {Node} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

import type {GrammarMatch} from "./matches.js"
import type {Editor} from "../types.js"

export interface GrammarSource {
    language: string
    view: EditorView
    getNodes: () => Node[]
    getStartPos: () => number
    posMap: Array<[number, number]>
    badPos: Array<[number, number]>
    text?: string
    matches?: GrammarMatch[]
}

interface GetTextArgs {
    nodes: readonly Node[]
    citationTexts: string[]
    pos?: number
    posMap?: Array<[number, number]>
    badPos?: Array<[number, number]>
}

export function getText({
    nodes,
    citationTexts,
    pos = 0,
    posMap = [],
    badPos = []
}: GetTextArgs): {text: string; pos: number} {
    let text = ""
    nodes.forEach(node => {
        if (node.marks?.find(mark => mark.type.name === "deletion")) {
            // Tracked deletion: the text is not sent to the engine, but
            // matches spanning the gap would map onto the deleted
            // passage in the document, so mark the boundary as
            // untranslatable.
            posMap.push([pos, node.nodeSize])
            badPos.push([pos, pos])
        } else if (node.type.name === "text") {
            pos += (node.text ?? "").length
            text += node.text
        } else if (node.isBlock) {
            if (node.type.name !== "doc") {
                pos++
                text += "\n"
            }
            if (node.content?.content) {
                const childText = getText({
                    nodes: node.content.content,
                    citationTexts,
                    pos,
                    posMap,
                    badPos
                })
                pos = childText.pos
                text += childText.text
            }

            if (
                node.type.name !== "doc" &&
                node.nodeSize - node.content.size === 2
            ) {
                pos++
                text += "\n"
            }
        } else if (node.type.name === "citation") {
            // Citation: replace the node with the citation text and add
            // that range to badPos so we don't report errors within it.
            const citationHTML = citationTexts.shift() ?? ""
            const dom = document.createElement("span")
            dom.innerHTML = citationHTML
            const citationText = dom.innerText
            text += citationText
            badPos.push([pos, pos + citationText.length])
            pos += citationText.length
            posMap.push([pos, node.nodeSize - citationText.length])
        } else {
            posMap.push([pos, node.nodeSize])
        }
    })
    return {text, pos}
}

/**
 * One source per top-level block of the main editor plus one per the
 * matching footnotes in the footnote editor, ported from the old plugin's
 * `initSources`. The closures re-read the current document, so a source
 * set must be rebuilt after structural document changes.
 */
export function initSources(editor: Editor): GrammarSource[] {
    const sources: GrammarSource[] = []
    editor.view.state.doc.forEach((_node, _offset, index) => {
        const language =
            editor.view.state.doc.child(index).attrs.language ||
            editor.view.state.doc.attrs.language
        sources.push({
            language,
            view: editor.view,
            getNodes: () => [editor.view.state.doc.child(index)],
            getStartPos: () => {
                let pos = 0
                for (let i = 0; i < index; i++) {
                    pos += editor.view.state.doc.child(i).nodeSize
                }
                return pos
            },
            posMap: [], // a map between doc positions in prosemirror and positions in the checked text
            badPos: [] // text positions that have no PM equivalents
        })
        sources.push({
            // footnote editor
            language,
            view: editor.mod.footnotes!.fnEditor.view,
            getNodes: () => {
                if (
                    editor.mod.footnotes!.fnEditor.view.state.doc.nodeSize === 2
                ) {
                    return []
                }
                let fnCount = 0
                editor.view.state.doc.child(index).descendants(node => {
                    if (node.type.name === "footnote") {
                        fnCount++
                    }
                })
                if (!fnCount) {
                    return []
                }
                let fnFromIndex = 0
                for (let i = 0; i < index; i++) {
                    editor.view.state.doc.child(i).descendants(node => {
                        if (node.type.name === "footnote") {
                            fnFromIndex++
                        }
                    })
                }
                return editor.mod.footnotes!.fnEditor.view.state.doc.content.content.slice(
                    fnFromIndex,
                    fnFromIndex + fnCount
                )
            },
            getStartPos: () => {
                let fnFromIndex = 0
                for (let i = 0; i < index; i++) {
                    editor.view.state.doc.child(i).descendants(node => {
                        if (node.type.name === "footnote") {
                            fnFromIndex++
                        }
                    })
                }
                let pos = 0
                for (let i = 0; i < fnFromIndex; i++) {
                    pos +=
                        editor.mod.footnotes!.fnEditor.view.state.doc.child(
                            i
                        ).nodeSize
                }
                return pos
            },
            posMap: [],
            badPos: []
        })
    })
    return sources
}
