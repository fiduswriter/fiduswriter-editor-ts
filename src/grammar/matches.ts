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

/** Limits for the per-user ignore lists (see ModGrammar). */
export const IGNORED_WORDS_MAX_ENTRIES = 5000
export const IGNORED_RULES_MAX_ENTRIES = 500
export const IGNORED_MAX_ENTRY_LENGTH = 200

/**
 * Misspelling-kind match, using the same classification as the
 * LingoTweaker extension (issueKind in its src/common/match.js): the
 * engine's issue_type contains "misspell" or is "unknownword". Matches
 * without an issue_type fall back to the TYPOS category (the spelling
 * decoration class). Drives both the ignored-words filter and the popup's
 * mutually exclusive actions.
 */
export function isMisspelling(match: GrammarMatch): boolean {
    const issueType = (match.issue_type ?? "").toLowerCase()
    if (issueType.length) {
        return issueType.includes("misspell") || issueType === "unknownword"
    }
    return match.category_id === "TYPOS"
}

/**
 * Remove matches the user has ignored: misspelling-kind matches whose
 * exact covered text is an ignored term, and matches of ignored rules
 * (any kind). Match ranges must be UTF-16 text offsets (see
 * `byteToTextRanges`); terms are compared lowercased.
 */
export function filterIgnored(
    matches: GrammarMatch[],
    text: string,
    ignoredTerms: Set<string>,
    ignoredRules: Set<string>
): GrammarMatch[] {
    if (!ignoredTerms.size && !ignoredRules.size) {
        return matches
    }
    return matches.filter(match => {
        if (ignoredRules.has(match.rule_id)) {
            return false
        }
        if (
            ignoredTerms.size &&
            isMisspelling(match) &&
            ignoredTerms.has(
                text.slice(match.range.start, match.range.end).toLowerCase()
            )
        ) {
            return false
        }
        return true
    })
}

/**
 * Normalize untrusted ignore-list entries: trim, drop empties and
 * over-length entries, dedupe (case-insensitively for word terms, exactly
 * for rule ids) and cap the count. Must stay in sync with the backend
 * validation of `grammar_check_ignored_words`/`_rules`.
 */
export function normalizeIgnoredList(
    entries: unknown,
    caseInsensitiveDedupe: boolean,
    maxEntries: number
): string[] {
    if (!Array.isArray(entries)) {
        return []
    }
    const normalized: string[] = []
    const seen = new Set<string>()
    entries.forEach(entry => {
        if (
            typeof entry !== "string" ||
            !entry.trim().length ||
            entry.trim().length > IGNORED_MAX_ENTRY_LENGTH
        ) {
            return
        }
        const trimmed = entry.trim()
        if (normalized.length >= maxEntries) {
            return
        }
        const key = caseInsensitiveDedupe ? trimmed.toLowerCase() : trimmed
        if (seen.has(key)) {
            return
        }
        seen.add(key)
        normalized.push(trimmed)
    })
    return normalized
}

/**
 * Read both ignore lists from the user preferences
 * `grammar_check_ignored_words`/`grammar_check_ignored_rules`; invalid
 * shapes yield empty lists.
 */
export function readIgnored(
    preferences?: Record<string, unknown>
): {words: string[]; rules: string[]} {
    const prefs = preferences ?? {}
    return {
        words: normalizeIgnoredList(
            prefs.grammar_check_ignored_words,
            true,
            IGNORED_WORDS_MAX_ENTRIES
        ),
        rules: normalizeIgnoredList(
            prefs.grammar_check_ignored_rules,
            false,
            IGNORED_RULES_MAX_ENTRIES
        )
    }
}
