// Jest mock for lingotweaker-wasm: a canned engine that reports a TYPOS
// match for the word "teh" and a GRAMMAR match for "very unique", with
// UTF-8 byte offsets like the real engine.

const encoder = new TextEncoder()

function byteOffsetOf(text, needle, fromIndex = 0) {
    const index = text.indexOf(needle, fromIndex)
    if (index === -1) {
        return -1
    }
    return encoder.encode(text.slice(0, index)).length
}

function checkMatches(text) {
    const matches = []
    const typoStart = byteOffsetOf(text, "teh")
    if (typoStart !== -1) {
        matches.push({
            rule_id: "MORFOLOGIK_RULE_EN_US",
            message: "Possible spelling mistake found.",
            short_message: "Spelling mistake",
            range: {start: typoStart, end: typoStart + 3},
            suggestions: [{value: "the"}],
            category_id: "TYPOS",
            category_name: "Possible Typo",
            issue_type: "misspelling",
            match_type: "exact",
            picky: false
        })
    }
    const grammarStart = byteOffsetOf(text, "very unique")
    if (grammarStart !== -1) {
        matches.push({
            rule_id: "EN_REPEATEDWORDS",
            message: "Style: <suggestion>unique</suggestion> is enough.",
            short_message: "Style",
            range: {start: grammarStart, end: grammarStart + 11},
            suggestions: [{value: "unique"}],
            category_id: "GRAMMAR",
            category_name: "Grammar",
            issue_type: "grammar",
            match_type: "exact",
            picky: true
        })
    }
    return matches
}

export class LtEngine {
    constructor(lang, _pack, _options) {
        this.langCode = lang
    }

    static new_multi(lang, packs, options) {
        return new LtEngine(lang, packs[0] ?? new Uint8Array(), options)
    }

    check_json(text) {
        return JSON.stringify({matches: checkMatches(text)})
    }

    check_matches_json(text) {
        return JSON.stringify({matches: checkMatches(text)})
    }

    compile_failures_json() {
        return "[]"
    }

    active_rule_count() {
        return 42
    }

    lang() {
        return this.langCode
    }

    variant() {
        return undefined
    }

    free() {}
}

export default async function init() {}
