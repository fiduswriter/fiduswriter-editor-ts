/**
 * Types and translation helpers for spell/grammar checker matches.
 *
 * The engine reports ranges as UTF-8 byte offsets relative to the checked
 * text; ProseMirror positions are UTF-16 code-unit based and offset by the
 * position of the text within the document. `translateMatches` performs
 * that conversion in two steps: byte offset → text offset (via
 * `TextDecoder`), text offset → ProseMirror position (via the source's
 * `posMap`, ported from the old languagetool plugin).
 */

export interface GrammarMatch {
    rule_id: string
    sub_id?: string
    message: string
    short_message?: string
    range: {start: number; end: number}
    suggestions: Array<{value: string; short_description?: string}>
    category_id?: string
    category_name?: string
    description?: string
    issue_type?: string
    match_type?: string
    picky?: boolean
}

export interface GrammarMatchPM extends GrammarMatch {
    from: number
    to: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** UTF-8 byte offset (engine format) → UTF-16 index (text format). */
export function utf16Index(bytes: Uint8Array, byteOffset: number): number {
    return decoder.decode(bytes.subarray(0, byteOffset)).length
}

/** Match messages contain markup (`<suggestion>…</suggestion>`). */
export function plainMessage(message: string): string {
    return (message ?? "")
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim()
}

/** Decoration class by category, keeping the old plugin's visual classes. */
export function matchClass(match: GrammarMatch): string {
    if (match.category_id === "TYPOS") {
        return "spelling"
    } else if (match.category_id === "GRAMMAR") {
        return "grammar"
    }
    return "language"
}

/**
 * Remove matches touching positions that cannot be translated to
 * ProseMirror positions (substituted citation text), ported from the old
 * plugin's `ltFilterMatches`.
 */
export function filterBadPos(
    badPos: Array<[number, number]>,
    matches: GrammarMatch[]
): GrammarMatch[] {
    return matches.filter(
        match =>
            !badPos.find(
                bad =>
                    (match.range.start < bad[0] &&
                        match.range.end > bad[0]) ||
                    (match.range.start < bad[1] &&
                        match.range.end > bad[1]) ||
                    (match.range.start >= bad[0] && match.range.end <= bad[1])
            )
    )
}

function transPos(
    textPos: number,
    posMap: Array<[number, number]>,
    assoc = 1
): number {
    // translate positions from the checked text to prosemirror
    // assoc: whether to increase or decrease when two options
    // are available. (positive = increase, negative = decrease)
    let offset = 0
    posMap.find(map => {
        if ((map[0] === textPos && assoc < 0) || map[0] > textPos) {
            return true
        } else {
            offset += map[1]
            return false
        }
    })
    return textPos + offset
}

/**
 * Translate byte-offset ranges into ProseMirror `from`/`to` positions,
 * ported from the old plugin's `transMatches`.
 */
export function translateMatches(
    matches: GrammarMatch[],
    text: string,
    startPos: number,
    posMap: Array<[number, number]>
): GrammarMatchPM[] {
    const bytes = encoder.encode(text)
    return matches.map(match =>
        Object.assign(
            {
                from:
                    startPos +
                    transPos(utf16Index(bytes, match.range.start), posMap),
                to:
                    startPos +
                    transPos(
                        utf16Index(bytes, match.range.end),
                        posMap,
                        -1
                    )
            },
            match
        )
    )
}

/**
 * Remove matches that touch non-text nodes in ProseMirror, ported from
 * the old plugin's `pmFilterMatches`.
 */
export function filterPMMatches(
    doc: {textBetween(from: number, to: number): string},
    matches: GrammarMatchPM[]
): GrammarMatchPM[] {
    return matches.filter(
        match =>
            doc.textBetween(match.from, match.to).length ===
            match.to - match.from
    )
}
