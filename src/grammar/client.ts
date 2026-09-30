/**
 * Main-thread client for the spell/grammar checker engine. Runs the
 * engine inside a Web Worker (`./worker.js` next to this module, so
 * bundlers can rewrite the URL) and falls back to running the engine on
 * the main thread when Workers are unavailable (tests, strict
 * environments).
 *
 * Check requests carry monotonically increasing ids and an epoch. Results
 * for ids from an older epoch are discarded (resolved empty) so a late
 * response from a superseded check run can never overwrite fresher
 * results — while concurrent checks within one epoch (one per text
 * source) all resolve normally.
 */

import type {GrammarMatch} from "./matches.js"
import type {GrammarLanguage} from "./languages.js"
import {fetchPackCached} from "./pack_cache.js"

interface PendingCheck {
    resolve(matches: GrammarMatch[][]): void
    reject(error: Error): void
    epoch: number
}

interface WorkerMessage {
    type: string
    id?: number
    lang?: string
    results?: Array<{index: number; matches: GrammarMatch[]}>
    message?: string
}

/**
 * The subset of `Worker` the client relies on; tests can inject a fake.
 */
export interface GrammarWorkerLike {
    postMessage(message: unknown): void
    terminate(): void
    onmessage: ((event: {data: unknown}) => void) | null
}

export class GrammarClient {
    private worker: GrammarWorkerLike | null = null
    private engine: import("lingotweaker-wasm").LtEngine | null = null
    private nextId = 0
    private epoch = 0
    private readonly pending = new Map<number, PendingCheck>()
    private loadChain: Promise<void> = Promise.resolve()
    private pendingLoad: {
        resolve(): void
        reject(error: Error): void
    } | null = null
    private destroyed = false

    loadedLanguage: string | null = null

    constructor(worker?: GrammarWorkerLike | null) {
        if (worker) {
            this.worker = worker
        } else if (typeof Worker !== "undefined") {
            this.worker = new Worker(
                new URL("./worker.js", import.meta.url),
                {type: "module"}
            ) as GrammarWorkerLike
        }
        if (this.worker) {
            this.worker.onmessage = event =>
                this.handleMessage(event.data as WorkerMessage)
        }
    }

    get hasWorker(): boolean {
        return this.worker !== null
    }

    /**
     * Load the engine for `language`. `packUrl` is the full URL of the
     * gzipped data pack to fetch.
     */
    load(language: GrammarLanguage, packUrl: string): Promise<void> {
        this.loadChain = this.loadChain.then(() =>
            this.loadEngine(language, packUrl)
        )
        return this.loadChain
    }

    private loadEngine(
        language: GrammarLanguage,
        packUrl: string
    ): Promise<void> {
        if (
            this.loadedLanguage === language.code &&
            (this.worker || this.engine)
        ) {
            return Promise.resolve()
        }
        this.loadedLanguage = null
        if (this.worker) {
            return new Promise<void>((resolve, reject) => {
                this.pendingLoad = {resolve, reject}
                this.worker!.postMessage({
                    type: "load",
                    lang: language.code,
                    packUrl,
                    variant: language.variant
                })
            })
        }
        return this.loadEngineInline(language, packUrl)
    }

    private async loadEngineInline(
        language: GrammarLanguage,
        packUrl: string
    ): Promise<void> {
        const {default: init, LtEngine} = await import("lingotweaker-wasm")
        const {decompressPack} = await import("lingotweaker-wasm/pack")
        await init()
        const bytes = await fetchPackCached(packUrl)
        // Some servers transparently gunzip .gz responses (Content-Encoding);
        // only inflate when the gzip magic bytes are actually present.
        const packBytes =
            bytes[0] === 0x1f && bytes[1] === 0x8b
                ? await decompressPack(bytes)
                : bytes
        const options = JSON.stringify({
            variant: language.variant || undefined,
            today: new Date().toISOString().slice(0, 10)
        })
        this.engine = new LtEngine(language.code, packBytes, options)
        this.loadedLanguage = language.code
    }

    /**
     * Start a new check epoch. Pending checks from older epochs resolve
     * with empty results once their (late) response arrives.
     */
    nextEpoch(): void {
        this.epoch++
    }

    check(texts: string[], epoch = this.epoch): Promise<GrammarMatch[][]> {
        if (this.destroyed) {
            return Promise.reject(new Error("client is destroyed"))
        }
        const id = ++this.nextId
        if (this.worker) {
            return new Promise<GrammarMatch[][]>((resolve, reject) => {
                this.pending.set(id, {resolve, reject, epoch})
                this.worker!.postMessage({type: "check", id, texts})
            })
        }
        if (this.engine) {
            const engine = this.engine
            const results = texts.map(text => {
                if (!text || text.trim().length === 0) {
                    return []
                }
                return JSON.parse(engine.check_matches_json(text))
                    .matches as GrammarMatch[]
            })
            return Promise.resolve(results)
        }
        return Promise.reject(new Error("engine is not loaded"))
    }

    destroy(): void {
        this.destroyed = true
        this.worker?.terminate()
        this.worker = null
        this.engine?.free()
        this.engine = null
        this.pending.forEach(({reject}) =>
            reject(new Error("client is destroyed"))
        )
        this.pending.clear()
        this.pendingLoad?.reject(new Error("client is destroyed"))
        this.pendingLoad = null
    }

    private handleMessage(message: WorkerMessage): void {
        switch (message.type) {
            case "ready":
                this.loadedLanguage = message.lang ?? null
                this.pendingLoad?.resolve()
                this.pendingLoad = null
                break
            case "result": {
                const id = message.id ?? 0
                const pendingCheck = this.pending.get(id)
                if (!pendingCheck) {
                    break
                }
                this.pending.delete(id)
                if (pendingCheck.epoch < this.epoch) {
                    // A newer check run superseded this one; discard the
                    // stale result.
                    pendingCheck.resolve([])
                } else {
                    pendingCheck.resolve(
                        (message.results ?? []).map(part => part.matches)
                    )
                }
                break
            }
            case "error": {
                const error = new Error(
                    message.message || "spell/grammar engine error"
                )
                if (this.pendingLoad) {
                    this.pendingLoad.reject(error)
                    this.pendingLoad = null
                } else {
                    this.pending.forEach(({reject}) => reject(error))
                    this.pending.clear()
                }
                break
            }
            default:
                break
        }
    }
}
