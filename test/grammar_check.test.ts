import {describe, test, expect, jest, afterEach, beforeAll, beforeEach} from "@jest/globals"

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

const PACK_BASE_URL = "https://static.example/lingotweaker-packs/"
const PACK_EN_URL = `${PACK_BASE_URL}en.pack.gz`
const PACK_PT_URL = `${PACK_BASE_URL}pt.pack.gz`
const REAL_FETCH = globalThis.fetch

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

        const loadPromise = client.load(
            {
                code: "en-US",
                pack: "en",
                variant: "en-GB"
            },
            PACK_EN_URL
        )
        await flush()
        expect(worker.messages[0]).toMatchObject({
            type: "load",
            lang: "en-US",
            packUrl: PACK_EN_URL,
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
        let fetchedUrl = ""
        globalThis.fetch = (async (url: unknown) => {
            fetchedUrl = String(url)
            return {
                ok: true,
                status: 200,
                arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer
            } as unknown as Response
        }) as unknown as typeof fetch
        try {
            await client.load({code: "en-US", pack: "en"}, PACK_EN_URL)
            expect(fetchedUrl).toBe(PACK_EN_URL)
            expect(client.loadedLanguage).toBe("en-US")
            const results = await client.check(["teh report was very unique"])
            expect(results[0].map(match => match.category_id).sort()).toEqual([
                "GRAMMAR",
                "TYPOS"
            ])
        } finally {
            globalThis.fetch = REAL_FETCH
        }
        client.destroy()
    })

    test("rejects the inline load when the pack fetch fails", async () => {
        const client = new GrammarClient(null)
        globalThis.fetch = (async () => {
            throw new Error("network down")
        }) as unknown as typeof fetch
        try {
            await expect(
                client.load({code: "en-US", pack: "en"}, PACK_EN_URL)
            ).rejects.toThrow("network down")
        } finally {
            globalThis.fetch = REAL_FETCH
        }
        client.destroy()
    })

    test("rejects pending loads on worker errors", async () => {
        const worker = new FakeWorker()
        const client = new GrammarClient(worker as never)
        const loadPromise = client.load(
            {code: "en-US", pack: "en"},
            PACK_EN_URL
        )
        await flush()
        worker.send({type: "error", message: "cannot load pack: HTTP 404"})
        await expect(loadPromise).rejects.toThrow("HTTP 404")
        client.destroy()
    })
})

describe("grammar worker", () => {
    const flush = () => new Promise(resolve => setTimeout(resolve, 0))
    let posted: Array<Record<string, unknown>> = []

    beforeAll(async () => {
        // The worker module expects a worker global scope at import time.
        const scope = globalThis as unknown as {
            self: unknown
            postMessage(message: unknown): void
            onmessage: ((event: {data: unknown}) => void) | null
        }
        scope.self = scope
        scope.postMessage = message => {
            posted.push(message as Record<string, unknown>)
        }
        await import("../src/grammar/worker.js")
    })

    afterEach(() => {
        globalThis.fetch = REAL_FETCH
        posted = []
        ;(globalThis as {__lingotweakerDecompressCalls?: unknown[]})
            .__lingotweakerDecompressCalls = []
    })

    beforeEach(() => {
        ;(globalThis as {__lingotweakerDecompressCalls?: unknown[]})
            .__lingotweakerDecompressCalls = []
    })

    const stubFetch = (options: {
        ok: boolean
        status: number
        bytes?: ArrayLike<number>
    }): (() => string) => {
        let fetchedUrl = ""
        globalThis.fetch = (async (url: unknown) => {
            fetchedUrl = String(url)
            const bytes = options.bytes ? Array.from(options.bytes) : []
            return {
                ok: options.ok,
                status: options.status,
                arrayBuffer: async () => new Uint8Array(bytes).buffer
            } as unknown as Response
        }) as unknown as typeof fetch
        return () => fetchedUrl
    }

    const sendMessage = (data: Record<string, unknown>) => {
        const scope = globalThis as unknown as {
            onmessage: ((event: {data: unknown}) => void) | null
        }
        scope.onmessage?.({data})
    }

    const sendLoad = (overrides: Record<string, unknown> = {}) =>
        sendMessage({
            type: "load",
            lang: "en-US",
            packUrl: PACK_EN_URL,
            ...overrides
        })

    test("fetches the pack from the packUrl and reports ready", async () => {
        const fetchedUrl = stubFetch({
            ok: true,
            status: 200,
            bytes: [0x1f, 0x8b, 7, 7, 7]
        })
        sendLoad()
        await flush()
        await flush()
        expect(fetchedUrl()).toBe(PACK_EN_URL)
        // The fetched bytes are handed to decompressPack, which gunzips
        // them (passthrough in the mock) before the engine is constructed.
        const decompressCalls = (
            globalThis as {__lingotweakerDecompressCalls?: Uint8Array[]}
        ).__lingotweakerDecompressCalls
        expect(decompressCalls).toHaveLength(1)
        expect(Array.from(new Uint8Array(decompressCalls![0]))).toEqual([
            0x1f, 0x8b, 7, 7, 7
        ])
        expect(posted).toContainEqual({type: "ready", lang: "en-US"})

        // The loaded engine answers checks.
        sendMessage({type: "check", id: 1, texts: ["teh"]})
        await flush()
        expect(posted[posted.length - 1]).toMatchObject({
            type: "result",
            id: 1
        })
    })

    test("accepts responses a server already gunzipped (no gzip magic bytes)", async () => {
        const fetchedUrl = stubFetch({ok: true, status: 200, bytes: [7, 7, 7]})
        sendLoad()
        await flush()
        await flush()
        expect(fetchedUrl()).toBe(PACK_EN_URL)
        // Servers that set Content-Encoding: gzip deliver the already
        // inflated pack — the worker must skip gunzipping in that case.
        const decompressCalls = (
            globalThis as {__lingotweakerDecompressCalls?: Uint8Array[]}
        ).__lingotweakerDecompressCalls
        expect(decompressCalls).toHaveLength(0)
        expect(posted).toContainEqual({type: "ready", lang: "en-US"})
    })

    test("fetches the pack URL it is given for variant codes", async () => {
        const fetchedUrl = stubFetch({ok: true, status: 200, bytes: [1]})
        sendLoad({lang: "pt-BR", packUrl: PACK_PT_URL, variant: "pt-BR"})
        await flush()
        await flush()
        expect(fetchedUrl()).toBe(PACK_PT_URL)
        expect(posted).toContainEqual({type: "ready", lang: "pt-BR"})
    })

    test("reports a clear load error when the pack fetch fails", async () => {
        stubFetch({ok: false, status: 404})
        sendLoad()
        await flush()
        await flush()
        expect(posted).toHaveLength(1)
        expect(posted[0].type).toBe("error")
        expect(String(posted[0].message)).toContain("HTTP 404")
        expect(String(posted[0].message)).toContain(PACK_EN_URL)
    })
})

describe("supported languages", () => {
    test("covers the Fidus Writer document language schema", () => {
        // Every language selectable in Fidus Writer's document schema
        // (fiduswriter-document-ts schema/document/structure.ts) must be
        // checkable, except the ones no language pack exists for.
        const schemaLanguages = [
            "af-ZA",
            "sq-AL",
            "ar",
            "ast",
            "be",
            "br",
            "bg",
            "ca",
            "ca-ES-Valencia",
            "zh-CN",
            "da",
            "nl",
            "en-AU",
            "en-CA",
            "en-NZ",
            "en-ZA",
            "en-GB",
            "en-US",
            "eo",
            "fr",
            "gl",
            "de-DE",
            "de-AU",
            "de-CH",
            "el",
            "he",
            "is",
            "it",
            "ja",
            "km",
            "lt",
            "ml",
            "nb-NO",
            "nn-NO",
            "fa",
            "pl",
            "pt-BR",
            "pt-PT",
            "ro",
            "ru",
            "tr",
            "sr-SP-Cy",
            "sr-SP-Lt",
            "sk",
            "sl",
            "es",
            "sv",
            "ta",
            "tl",
            "uk"
        ]
        const noPackLanguages = ["af-ZA", "sq-AL", "bg", "he", "tr"]
        const missing = schemaLanguages.filter(
            code =>
                !noPackLanguages.includes(code) && !grammarLanguage(code)
        )
        expect(missing).toEqual([])
    })

    test("maps schema codes, import variants and variants to packs", () => {
        expect(GRAMMAR_LANGUAGE_CODES).toContain("en-US")
        expect(GRAMMAR_LANGUAGE_CODES).toContain("en-GB")
        expect(grammarLanguage("de-AT")).toMatchObject({
            pack: "de",
            variant: "de-AT"
        })
        expect(grammarLanguage("en-US")).toMatchObject({pack: "en"})
        expect(grammarLanguage("fr")).toMatchObject({pack: "fr"})
        expect(grammarLanguage("es")).toMatchObject({pack: "es"})
        expect(grammarLanguage("nb-NO")).toMatchObject({pack: "no"})
        expect(grammarLanguage("nn-NO")).toMatchObject({pack: "nn"})
        expect(grammarLanguage("sr-SP-Cy")).toMatchObject({pack: "sr"})
        expect(grammarLanguage("ca-ES-Valencia")).toMatchObject({pack: "ca"})
        expect(grammarLanguage("en-AU")).toMatchObject({pack: "en"})
        expect(grammarLanguage("de-AU")).toMatchObject({pack: "de"})
        expect(grammarLanguage("xx-YY")).toBeUndefined()
        expect(GRAMMAR_LANGUAGES.length).toBe(GRAMMAR_LANGUAGE_CODES.length)
    })

    test("excludes languages Fidus Writer does not support", () => {
        // These packs exist upstream but no Fidus Writer document language
        // (schema or plausible DOCX import code) maps to them.
        expect(grammarLanguage("nrd")).toBeUndefined()
        expect(grammarLanguage("gn-ES")).toBeUndefined()
        expect(grammarLanguage("crh-UA")).toBeUndefined()
        expect(grammarLanguage("de-DE-x-simple-language")).toBeUndefined()
        expect(grammarLanguage("pt-AO")).toBeUndefined()
        expect(grammarLanguage("pt-MZ")).toBeUndefined()
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

describe("ModGrammar pack URL", () => {
    test("defaults to staticUrl('lingotweaker-packs/<pack>.pack.gz')", () => {
        const editor = makeFakeEditor({})
        const grammar = new ModGrammar(editor)
        expect(grammar.packUrl("en")).toBe("lingotweaker-packs/en.pack.gz")
        grammar.close()
    })

    test("grammar_check_pack_base_url in the app config overrides it", () => {
        const editor = makeFakeEditor({})
        editor.app.config.grammar_check_pack_base_url =
            "https://cdn.example/packs/"
        const grammar = new ModGrammar(editor)
        expect(grammar.packUrl("en")).toBe("https://cdn.example/packs/en.pack.gz")
        grammar.close()
    })

    test("ensureLoaded resolves the pack URL for the client", async () => {
        const editor = makeFakeEditor({})
        const grammar = new ModGrammar(editor)
        const load = jest
            .spyOn(grammar.client, "load")
            .mockReturnValue(Promise.resolve())
        await grammar.ensureLoaded("en-US")
        expect(load).toHaveBeenCalledWith(
            {code: "en-US", pack: "en"},
            "lingotweaker-packs/en.pack.gz"
        )
        grammar.close()
    })
})
