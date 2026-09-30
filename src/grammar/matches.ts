/**
 * Types and translation helpers for spell/grammar checker matches.
 *
 * The engine reports ranges as UTF-8 byte offsets relative to the
 * checked text (verified against the engine: `café` is reported as
 * 0–5). ProseMirror positions are UTF-16 code-unit based and offset by
 * the position of the text within the document. `byteToTextRanges`
 * converts engine byte offsets to text offsets, and `translateMatches`
 * maps those to ProseMirror positions via the source's `posMap`
 * (ported from the old languagetool plugin).
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
 * ProseMirror positions (substituted citation text, tracked deletions),
 * ported from the old plugin's `ltFilterMatches`. Match ranges and
 * `badPos` must both be UTF-16 text offsets — the engine's byte offsets
 * need `byteToTextRanges` first, or non-ASCII citation/deleted text lets
 * matches through that should have been dropped.
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

/**
 * Convert the engine's UTF-8 byte offsets into UTF-16 text offsets.
 * Done once per check result so every further step (badPos filtering,
 * posMap translation) works in one unit.
 */
export function byteToTextRanges(
    matches: GrammarMatch[],
    text: string
): GrammarMatch[] {
    const bytes = encoder.encode(text)
    return matches.map(match =>
        Object.assign({}, match, {
            range: {
                start: utf16Index(bytes, match.range.start),
                end: utf16Index(bytes, match.range.end)
            }
        })
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
 * Translate text-offset ranges into ProseMirror `from`/`to` positions,
 * ported from the old plugin's `transMatches`. Match ranges must already
 * be UTF-16 text offsets (see `byteToTextRanges`).
 */
export function translateMatches(
    matches: GrammarMatch[],
    startPos: number,
    posMap: Array<[number, number]>
): GrammarMatchPM[] {
    return matches.map(match =>
        Object.assign(
            {
                from: startPos + transPos(match.range.start, posMap),
                to: startPos + transPos(match.range.end, posMap, -1)
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
