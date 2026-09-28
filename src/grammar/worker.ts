/**
 * Web Worker owning the spell/grammar checker engine. Loads the language
 * pack, instantiates the wasm engine, and checks texts on request so that
 * engine construction and checks never block the main thread. Ported from
 * the LingoTweaker demo worker.
 *
 * Message protocol:
 * in:  {type: "load", lang, pack, variant?, picky?}
 * in:  {type: "check", id, texts: string[]}
 * out: {type: "ready", lang}
 * out: {type: "error", message}
 * out: {type: "result", id, results: [{index, matches}]}
 */

import init, {LtEngine} from "lingotweaker-wasm"
import {fetchPack} from "lingotweaker-wasm/pack"

import type {GrammarMatch} from "./matches.js"

interface LoadMessage {
    type: "load"
    lang: string
    pack: string
    variant?: string
    picky?: boolean
}

interface CheckMessage {
    type: "check"
    id: number
    texts: string[]
}

type IncomingMessage = LoadMessage | CheckMessage

interface ResultPart {
    index: number
    matches: GrammarMatch[]
}

const workerScope = self as unknown as {
    postMessage(message: unknown): void
    onmessage: ((event: {data: IncomingMessage}) => void) | null
}

let initPromise: Promise<unknown> | null = null
let engine: LtEngine | null = null
let loadGeneration = 0

// Per-text check results (text → matches): an edit burst re-checks every
// source, but only the edited ones changed; capped LRU-style by insertion
// and cleared on every engine (re)load.
const textCache = new Map<string, GrammarMatch[]>()
const TEXT_CACHE_MAX = 200

function post(message: unknown): void {
    workerScope.postMessage(message)
}

function ensureInit(): Promise<unknown> {
    initPromise ??= init()
    return initPromise
}

function baseLanguage(pack: string): string {
    return pack.split("-")[0]
}

async function loadPack(pack: string): Promise<Uint8Array> {
    try {
        return await fetchPack(pack)
    } catch (error) {
        const base = baseLanguage(pack)
        if (base === pack) {
            throw error
        }
        // Fall back to the base language (e.g. "en-US" → "en").
        return fetchPack(base)
    }
}

async function load(message: LoadMessage): Promise<void> {
    const generation = ++loadGeneration
    engine = null
    textCache.clear()
    await ensureInit()
    const packBytes = await loadPack(message.pack)
    if (generation !== loadGeneration) {
        return
    }
    const options = JSON.stringify({
        variant: message.variant || undefined,
        // The wasm engine has no clock, so the date is passed in.
        today: new Date().toISOString().slice(0, 10),
        picky: message.picky === true
    })
    engine = new LtEngine(message.lang, packBytes, options)
    if (generation !== loadGeneration) {
        return
    }
    post({type: "ready", lang: message.lang})
}

function check(message: CheckMessage): void {
    if (!engine) {
        post({type: "error", message: "engine is not loaded"})
        return
    }
    const results: ResultPart[] = message.texts.map((text, index) => {
        if (!text || text.trim().length === 0) {
            return {index, matches: [] as GrammarMatch[]}
        }
        const cached = textCache.get(text)
        if (cached) {
            return {index, matches: cached}
        }
        const matches = (
            JSON.parse(engine!.check_matches_json(text)) as {
                matches: GrammarMatch[]
            }
        ).matches
        if (textCache.size >= TEXT_CACHE_MAX) {
            textCache.delete(textCache.keys().next().value!)
        }
        textCache.set(text, matches)
        return {index, matches}
    })
    post({type: "result", id: message.id, results})
}

async function handleMessage(message: IncomingMessage): Promise<void> {
    if (message.type === "load") {
        await load(message)
    } else if (message.type === "check") {
        check(message)
    }
}

workerScope.onmessage = event => {
    handleMessage(event.data).catch(error => {
        post({
            type: "error",
            message: String(error?.message ?? error)
        })
    })
}
