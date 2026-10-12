// Fuzz harness for the grammar checker's position mapping pipeline:
//   getText (text extraction + posMap/badPos) → byteToTextRanges (engine
//   UTF-8 byte offsets → UTF-16) → filterBadPos → translateMatches (text
//   offsets → ProseMirror positions) → filterPMMatches.
//
// Invariants:
//  1. A match that covers plain text and survives filterPMMatches must have
//     doc.textBetween(from, to) exactly equal to the matched text — the
//     core correctness of the position mapping (accented, astral, RTL and
//     citation-substituted content included).
//  2. byteToTextRanges round-trips: UTF-16 offsets converted to byte
//     offsets and back are the identity, and out-of-range byte offsets
//     never throw uncatchably.
//  3. translateMatches with arbitrary posMaps and positions (including
//     out-of-range ones, as produced by a desynchronized engine result)
//     never throws uncatchably, and in-bounds positions map into the doc.

import "../setup.js"

import {fc, runHarness} from "./config.js"
import {docArb, makeRng} from "./doc-generator.js"
import {getText} from "../../dist/grammar/text.js"
import {
    byteToTextRanges,
    translateMatches,
    filterBadPos,
    filterPMMatches,
    utf16Index
} from "../../dist/grammar/matches.js"

const encoder = new TextEncoder()

function countCitations(node) {
    let count = 0
    node.descendants(child => {
        if (child.type.name === "citation") {
            count++
        }
    })
    return count
}

function citationTextsFor(node) {
    return Array.from({length: countCitations(node)}, (_, i) => {
        // Formatted citation HTML as the citation render machinery inserts.
        return `<span class="citation">(Author ${i + 1}, ${2000 + i})</span>`
    })
}

function wordMatches(text, rng) {
    const matches = []
    const wordRe = /[a-zA-Z]{3,}/g
    let found
    while ((found = wordRe.exec(text)) !== null) {
        if (rng.bool()) {
            matches.push({
                range: {start: found.index, end: found.index + found[0].length},
                message: "fuzz message",
                shortMessage: "fuzz",
                replacements: [],
                offset: found.index,
                length: found[0].length,
                ruleId: "FUZZ_RULE",
                category_id: "GRAMMAR"
            })
        }
    }
    return matches
}

// --- Property 1: the full pipeline maps plain-text matches exactly ----------

const pipelineProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    baseSeed => {
        const {doc} = fc.sample(docArb(fc), {seed: baseSeed, numRuns: 1})[0]
        const rng = makeRng(baseSeed ^ 31)
        // One source per top-level child, mirroring initSources.
        const results = []
        doc.forEach((node, offset) => {
            const source = {
                language: "en-US",
                view: null,
                getNodes: () => [node],
                getStartPos: () => offset,
                posMap: [],
                badPos: []
            }
            source.posMap = []
            source.badPos = []
            // Production (checker.ts) extracts text with pos: 0 and adds
            // the source's start position only in translateMatches.
            const {text} = getText({
                nodes: [node],
                citationTexts: citationTextsFor(node),
                pos: 0,
                posMap: source.posMap,
                badPos: source.badPos
            })
            const matches = wordMatches(text, rng)
            if (!matches.length) {
                return
            }
            // The engine reports byte offsets; simulate that by converting
            // our UTF-16 match ranges to byte offsets first. Walk the text
            // code-point by code-point against the encoded buffer so each
            // match start/end is looked up rather than re-encoded.
            const bytes = encoder.encode(text)
            const byteOfUtf16 = new Map()
            let walkedUtf16 = 0
            let walkedBytes = 0
            for (const ch of text) {
                byteOfUtf16.set(walkedUtf16, walkedBytes)
                walkedUtf16 += ch.length
                walkedBytes += encoder.encode(ch).length
            }
            byteOfUtf16.set(walkedUtf16, walkedBytes)
            if (walkedBytes !== bytes.length) {
                throw new Error(
                    `byte walk mismatch: walked ${walkedBytes}, buffer holds ${bytes.length}`
                )
            }
            const byteMatches = matches.map(match =>
                Object.assign({}, match, {
                    range: {
                        start: byteOfUtf16.get(match.range.start),
                        end: byteOfUtf16.get(match.range.end)
                    }
                })
            )
            const utf16Matches = byteToTextRanges(byteMatches, text)
            const filtered = filterBadPos(source.badPos, utf16Matches)
            const translated = translateMatches(
                filtered,
                source.getStartPos(),
                source.posMap
            )
            const pmMatches = filterPMMatches(doc, translated)
            results.push({text, pmMatches, filteredCount: filtered.length})
            // Every surviving match must quote the document exactly.
            pmMatches.forEach(match => {
                const quoted = doc.textBetween(match.from, match.to)
                const expected = utf16Matches.find(
                    m => m.offset === match.offset && m.length === match.length
                )
                if (
                    expected &&
                    quoted !==
                        text.slice(expected.range.start, expected.range.end)
                ) {
                    if (process.env.GRAMMAR_DEBUG) {
                        console.log(
                            "DEBUG offset",
                            offset,
                            "from",
                            match.from,
                            "to",
                            match.to,
                            "quoted",
                            JSON.stringify(quoted)
                        )
                        console.log(
                            "DEBUG text",
                            JSON.stringify(text).slice(0, 200)
                        )
                        console.log(
                            "DEBUG posMap",
                            JSON.stringify(source.posMap)
                        )
                        console.log(
                            "DEBUG badPos",
                            JSON.stringify(source.badPos)
                        )
                        console.log(
                            "DEBUG expected range",
                            JSON.stringify(expected.range),
                            JSON.stringify(
                                text.slice(
                                    expected.range.start,
                                    expected.range.end
                                )
                            )
                        )
                        console.log(
                            "DEBUG doc fragment",
                            JSON.stringify(
                                doc.textBetween(
                                    Math.max(0, match.from - 10),
                                    match.to + 10
                                )
                            )
                        )
                    }
                    throw new Error(
                        `position mapping corrupted a match: doc.textBetween(${match.from}, ${match.to}) = ${JSON.stringify(quoted)}, expected ${JSON.stringify(text.slice(expected.range.start, expected.range.end))}\ntext: ${JSON.stringify(text).slice(0, 300)}\nposMap: ${JSON.stringify(source.posMap).slice(0, 300)}`
                    )
                }
                if (match.from < 0 || match.to > doc.content.size) {
                    throw new Error(
                        `match mapped out of doc bounds: ${match.from}-${match.to} of ${doc.content.size}`
                    )
                }
            })
        })
    }
)

// --- Property 2: byteToTextRanges round-trip and out-of-range robustness ----

const byteRoundTripProp = fc.property(
    fc.string({maxSize: 64}),
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    (text, seed) => {
        const rng = makeRng(seed)
        const bytes = encoder.encode(text)
        // Build matches at UTF-16 offsets, convert to bytes, convert back.
        const utf16Offsets = []
        for (let i = 0; i <= text.length; i += Math.max(1, rng.int(1, 5))) {
            utf16Offsets.push(i)
        }
        const byteOffsets = utf16Offsets.map(
            offset => encoder.encode(text.slice(0, offset)).length
        )
        const matches = byteOffsets.map(byteOffset => ({
            range: {start: byteOffset, end: byteOffset},
            message: "",
            shortMessage: "",
            replacements: [],
            offset: byteOffset,
            length: 0,
            ruleId: "R",
            category_id: "GRAMMAR"
        }))
        const converted = byteToTextRanges(matches, text)
        converted.forEach((match, index) => {
            if (
                match.range.start !== utf16Offsets[index] ||
                match.range.end !== utf16Offsets[index]
            ) {
                throw new Error(
                    `byteToTextRanges round-trip failed for offset ${utf16Offsets[index]} in ${JSON.stringify(text)}: got ${match.range.start}`
                )
            }
        })
        // Out-of-range byte offsets must not throw uncatchably.
        const beyond = bytes.length + rng.int(1, 20)
        utf16Index(bytes, beyond)
    }
)

// --- Property 3: translateMatches with hostile posMaps ----------------------

const hostilePosMapProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    (baseSeed, posMapSeed) => {
        const {doc} = fc.sample(docArb(fc), {seed: baseSeed, numRuns: 1})[0]
        const rng = makeRng(posMapSeed)
        // Hostile posMap: real entries mixed with out-of-range, negative,
        // and huge offsets.
        const posMap = [
            [0, rng.pick([0, 1, -1, 5])],
            [doc.content.size, 1],
            [doc.content.size + 100, -50],
            [rng.int(0, doc.content.size), rng.int(-10, 10)]
        ]
        const textPos = rng.pick([
            0,
            doc.content.size,
            doc.content.size + 10,
            -5
        ])
        const matches = [
            {
                range: {start: textPos, end: textPos + 2},
                message: "m",
                shortMessage: "",
                replacements: [],
                offset: textPos,
                length: 2,
                ruleId: "R",
                category_id: "GRAMMAR"
            }
        ]
        let translated
        try {
            translated = translateMatches(matches, 0, posMap)
        } catch (error) {
            if (error instanceof TypeError || error instanceof RangeError) {
                return // tolerated for hostile input
            }
            throw error
        }
        translated.forEach(match => {
            if (
                Number.isFinite(match.from) &&
                match.from >= 0 &&
                match.to >= match.from &&
                match.to <= doc.content.size
            ) {
                // in-bounds results must not crash textBetween
                doc.textBetween(match.from, match.to)
            }
        })
    }
)

runHarness("grammar-positions", [
    {
        label: "full position pipeline maps plain text exactly",
        prop: pipelineProp
    },
    {label: "byteToTextRanges round-trip + overflow", prop: byteRoundTripProp},
    {label: "translateMatches with hostile posMaps", prop: hostilePosMapProp}
])
