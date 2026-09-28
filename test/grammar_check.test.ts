import {describe, test, expect, jest, afterEach} from "@jest/globals"

import {GrammarClient} from "../src/grammar/client.js"
import {
    GRAMMAR_LANGUAGES,
    GRAMMAR_LANGUAGE_CODES,
    grammarLanguage
} from "../src/grammar/languages.js"
import {
    filterBadPos,
    matchClass,
    plainMessage,
    translateMatches,
    utf16Index,
    type GrammarMatch
} from "../src/grammar/matches.js"
import {getText} from "../src/grammar/text.js"
import {ModGrammar} from "../src/grammar/checker.js"

const encoder = new TextEncoder()

const matchAt = (text: string, needle: string, categoryId: string): GrammarMatch => {
    const index = text.indexOf(needle)
    const start = encoder.encode(text.slice(0, index)).length
    return {
        rule_id: `${categoryId}_RULE`,
        message: `issue in ${needle}`,
        range: {start, end: start + encoder.encode(needle).length},
        suggestions: [],
        category_id: categoryId
    }
}

describe("utf16Index", () => {
    test("converts UTF-8 byte offsets to UTF-16 indices", () => {
        const bytes = encoder.encode("héllo")
        expect(utf16Index(bytes, 0)).toBe(0)
        // é takes two UTF-8 bytes but a single UTF-16 code unit
        expect(utf16Index(bytes, 3)).toBe(2)
        expect(utf16Index(bytes, bytes.length)).toBe(5)
    })

    test("handles astral characters as surrogate pairs", () => {
        const text = "a😀b"
        const bytes = encoder.encode(text)
        expect(bytes.length).toBe(6)
        // 😀 takes four UTF-8 bytes and two UTF-16 code units
        expect(utf16Index(bytes, 5)).toBe(3)
        expect(utf16Index(bytes, bytes.length)).toBe(4)
    })
})

describe("match classification", () => {
    test("maps categories to the old decoration classes", () => {
        const base = {
            rule_id: "X",
            message: "m",
            range: {start: 0, end: 1},
            suggestions: []
        }
        expect(matchClass({...base, category_id: "TYPOS"})).toBe("spelling")
        expect(matchClass({...base, category_id: "GRAMMAR"})).toBe("grammar")
        expect(matchClass({...base, category_id: "STYLE"})).toBe("language")
        expect(matchClass(base)).toBe("language")
    })

    test("plainMessage strips suggestion markup", () => {
        expect(plainMessage("Style: <suggestion>unique</suggestion> is enough.")).toBe(
            "Style: unique is enough."
        )
    })
})

describe("translateMatches", () => {
    test("translates byte offsets through text and posMap", () => {
        const text = "héllo wörld"
        const match = matchAt(text, "wörld", "GRAMMAR")
        const [translated] = translateMatches([match], text, 10, [])
        expect(translated.from).toBe(10 + 6)
        expect(translated.to).toBe(10 + 11)
    })

    test("applies posMap offsets around non-text nodes", () => {
        const text = "one two"
        const match = matchAt(text, "two", "TYPOS")
        // A 5-PM-unit non-text node sits at text position 3
        const posMap: Array<[number, number]> = [[3, 5]]
        const [translated] = translateMatches([match], text, 0, posMap)
        expect(translated.from).toBe(9)
        expect(translated.to).toBe(12)
    })

    test("keeps match boundaries on the near side of position gaps", () => {
        const text = "ab cd"
        const match = matchAt(text, "ab", "TYPOS")
        const posMap: Array<[number, number]> = [[2, 5]]
        const [translated] = translateMatches([match], text, 0, posMap)
        expect(translated.from).toBe(0)
        // The end lands exactly on the gap; assoc -1 keeps it before the gap
        expect(translated.to).toBe(2)
    })
})

describe("filterBadPos", () => {
    test("drops matches touching untranslatable positions", () => {
        const text = "see (Doe, 2020) end"
        const inside = matchAt(text, "Doe", "TYPOS")
        const outside = matchAt(text, "end", "TYPOS")
        const badPos: Array<[number, number]> = [[4, 15]]
        const kept = filterBadPos(badPos, [inside, outside])
        expect(kept).toHaveLength(1)
        expect(kept[0].rule_id).toBe(outside.rule_id)
    })
})

interface FixtureNode {
    type: {name: string}
    text?: string
    marks?: Array<{type: {name: string}}>
    isBlock: boolean
    nodeSize: number
    content?: {size: number; content: FixtureNode[]}
}

const textNode = (
    text: string,
    marks: Array<{type: {name: string}}> = []
): FixtureNode => ({
    type: {name: "text"},
    text,
    marks,
    isBlock: false,
    nodeSize: text.length
})

const deletionMark = [{type: {name: "deletion"}}]

const blockNode = (name: string, children: FixtureNode[]): FixtureNode => {
    const size = children.reduce((sum, child) => sum + child.nodeSize, 0)
    return {
        type: {name},
        isBlock: true,
        nodeSize: size + 2,
        content: {size, content: children}
    }
}

const citationNode = (): FixtureNode => ({
    type: {name: "citation"},
    isBlock: false,
    nodeSize: 1
})

describe("getText", () => {
    test("extracts text with citation substitution and tracked deletions", () => {
        const paragraph = blockNode("paragraph", [
            textNode("Hello "),
            citationNode(),
            textNode(" world"),
            textNode("gone", deletionMark)
        ])
        const posMap: Array<[number, number]> = [],
            badPos: Array<[number, number]> = []
        const {text} = getText({
            nodes: [paragraph],
            citationTexts: ["<span>(Doe, 2020)</span>"],
            pos: 0,
            posMap,
            badPos
        })
        // The paragraph contributes leading and trailing newlines, the
        // citation is substituted, the deletion is excluded.
        expect(text).toBe("\nHello (Doe, 2020) world\n")
        expect(badPos).toHaveLength(1)
        const citationStart = text.indexOf("(Doe, 2020)")
        expect(badPos[0][0]).toBe(citationStart)
        expect(badPos[0][1]).toBe(citationStart + "(Doe, 2020)".length)
        // The citation node and the deleted text are position gaps
        expect(posMap.length).toBe(2)
    })

    test("feeds translateMatches so real text maps correctly", () => {
        const paragraph = blockNode("paragraph", [
            textNode("Hello "),
            citationNode(),
            textNode(" world")
        ])
        const posMap: Array<[number, number]> = [],
            badPos: Array<[number, number]> = []
        const {text} = getText({
            nodes: [paragraph],
            citationTexts: ["(Doe, 2020)"],
            pos: 0,
            posMap,
            badPos
        })
        const engineMatch = matchAt(text, "world", "TYPOS")
        expect(filterBadPos(badPos, [engineMatch])).toHaveLength(1)
        const [translated] = translateMatches(
            filterBadPos(badPos, [engineMatch]),
            text,
            0,
            posMap
        )
        // PM positions: paragraph opening token + "Hello " + the citation
        // node (1) + " "
        expect(translated.from).toBe(1 + "Hello ".length + 1 + 1)
        expect(translated.to).toBe(translated.from + "world".length)
    })
})

class FakeWorker {
    messages: Array<Record<string, unknown>> = []
    onmessage: ((event: {data: unknown}) => void) | null = null

    postMessage(message: unknown): void {
        this.messages.push(message as Record<string, unknown>)
    }

    terminate(): void {}

    send(data: unknown): void {
        this.onmessage?.({data})
    }

    lastCheckMessage(): {id: number; texts: string[]} {
        const checks = this.messages.filter(message => message.type === "check")
        return checks[checks.length - 1] as {id: number; texts: string[]}
    }
}

describe("GrammarClient", () => {
    const flush = () => new Promise(resolve => setTimeout(resolve, 0))

    test("loads and checks through a worker, discarding stale results", async () => {
        const worker = new FakeWorker()
        const client = new GrammarClient(worker as never)
        expect(client.hasWorker).toBe(true)

        const loadPromise = client.load({
            code: "en-US",
            pack: "en",
            variant: "en-GB"
        })
        await flush()
        expect(worker.messages[0]).toMatchObject({
            type: "load",
            lang: "en-US",
            pack: "en",
            variant: "en-GB"
        })
        worker.send({type: "ready", lang: "en-US"})
        await loadPromise
        expect(client.loadedLanguage).toBe("en-US")

        const first = client.check(["teh first"])
        const second = client.check(["teh second"])
        const firstMessage = worker.messages.find(
            message => message.type === "check" && message.id === 1
        ) as {id: number}
        const secondMessage = worker.lastCheckMessage()

        // The first check responds late, after the second was issued.
        worker.send({
            type: "result",
            id: firstMessage.id,
            results: [
                {index: 0, matches: [matchAt("teh first", "teh", "TYPOS")]}
            ]
        })
        const staleResults = await first
        expect(staleResults).toEqual([])

        worker.send({
            type: "result",
            id: secondMessage.id,
            results: [
                {index: 0, matches: [matchAt("teh second", "teh", "TYPOS")]}
            ]
        })
        const freshResults = await second
        expect(freshResults[0]).toHaveLength(1)
        expect(freshResults[0][0].category_id).toBe("TYPOS")

        client.destroy()
        expect(() => worker.send({type: "error", message: "late"})).not.toThrow()
    })

    test("rejects checks while the engine is not loaded", () => {
        const client = new GrammarClient(null)
        expect(client.hasWorker).toBe(false)
        return expect(client.check(["text"])).rejects.toThrow(
            "engine is not loaded"
        )
    })

    test("falls back to a main-thread engine when no Worker exists", async () => {
        const client = new GrammarClient(null)
        await client.load({code: "en-US", pack: "en"})
        expect(client.loadedLanguage).toBe("en-US")
        const results = await client.check(["teh report was very unique"])
        expect(results[0].map(match => match.category_id).sort()).toEqual([
            "GRAMMAR",
            "TYPOS"
        ])
        client.destroy()
    })

    test("rejects pending loads on worker errors", async () => {
        const worker = new FakeWorker()
        const client = new GrammarClient(worker as never)
        const loadPromise = client.load({code: "en-US", pack: "en"})
        await flush()
        worker.send({type: "error", message: "cannot load pack: HTTP 404"})
        await expect(loadPromise).rejects.toThrow("HTTP 404")
        client.destroy()
    })
})

describe("supported languages", () => {
    test("includes variants and special codes", () => {
        expect(GRAMMAR_LANGUAGE_CODES).toContain("en-US")
        expect(GRAMMAR_LANGUAGE_CODES).toContain("en-GB")
        expect(GRAMMAR_LANGUAGE_CODES).toContain("de-DE-x-simple-language")
        expect(GRAMMAR_LANGUAGE_CODES).toContain("nrd")
        expect(GRAMMAR_LANGUAGE_CODES).toContain("ja-JP")
        expect(grammarLanguage("de-AT")).toMatchObject({
            pack: "de",
            variant: "de-AT"
        })
        expect(grammarLanguage("en-US")).toMatchObject({pack: "en"})
        expect(grammarLanguage("fr")).toMatchObject({pack: "fr"})
        expect(grammarLanguage("xx-YY")).toBeUndefined()
        expect(GRAMMAR_LANGUAGES.length).toBe(GRAMMAR_LANGUAGE_CODES.length)
    })
})

const makeFakeEditor = (preferences: Record<string, boolean>) => {
    const doc = {
        attrs: {language: "en-US"},
        forEach: () => {},
        child: () => null
    }
    return {
        app: {
            config: {user: {preferences}},
            isOffline: () => false
        },
        docInfo: {access_rights: "write"},
        view: {state: {doc}, dispatch: () => {}},
        mod: {
            footnotes: {
                fnEditor: {view: {state: {doc}, dispatch: () => {}}}
            }
        }
    } as never
}

describe("ModGrammar continuous checking", () => {
    afterEach(() => {
        jest.useRealTimers()
    })

    test("is off without the user preference", () => {
        const editor = makeFakeEditor({})
        const grammar = new ModGrammar(editor)
        expect(grammar.continuous).toBe(false)
        const runCheck = jest.spyOn(grammar, "runCheck")
        grammar.onDocChanged()
        expect(runCheck).not.toHaveBeenCalled()
        grammar.close()
    })

    test("skips when the engine for the document language is not loaded", () => {
        const editor = makeFakeEditor({grammar_check_continuous: true})
        const grammar = new ModGrammar(editor)
        expect(grammar.continuous).toBe(true)
        const runCheck = jest.spyOn(grammar, "runCheck")
        grammar.onDocChanged()
        expect(runCheck).not.toHaveBeenCalled()
        expect(grammar.checkTimer).toBeNull()
        grammar.close()
    })

    test("schedules a debounced check once the engine is loaded", () => {
        jest.useFakeTimers()
        const editor = makeFakeEditor({grammar_check_continuous: true})
        const grammar = new ModGrammar(editor)
        grammar.client.loadedLanguage = "en-US"
        const runCheck = jest
            .spyOn(grammar, "runCheck")
            .mockReturnValue(Promise.resolve())
        grammar.onDocChanged()
        expect(grammar.checkTimer).not.toBeNull()
        expect(runCheck).not.toHaveBeenCalled()
        jest.advanceTimersByTime(700)
        expect(runCheck).toHaveBeenCalledWith(true)
        grammar.close()
    })

    test("unsupported languages and read-only access gate checking", () => {
        const editor = makeFakeEditor({grammar_check_continuous: true})
        const grammar = new ModGrammar(editor)
        expect(grammar.isSupported("en-US")).toBe(true)
        expect(grammar.isSupported("xx-YY")).toBe(false)
        expect(grammar.canCheck()).toBe(true)
        editor.docInfo.access_rights = "read"
        expect(grammar.canCheck()).toBe(false)
        grammar.close()
    })

    test("onLanguageChange invalidates pending results and sources", () => {
        jest.useFakeTimers()
        const editor = makeFakeEditor({grammar_check_continuous: true})
        const grammar = new ModGrammar(editor)
        grammar.client.loadedLanguage = "en-US"
        const runId = grammar.runId
        grammar.sources = []
        grammar.onLanguageChange()
        expect(grammar.runId).toBeGreaterThan(runId)
        expect(grammar.sources).toBe(false)
        expect(grammar.hasChecked).toBe(false)
        grammar.close()
    })
})
