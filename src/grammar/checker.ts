/**
 * Built-in spell/grammar checker (ModGrammar), replacing the old Django
 * languagetool plugin with the client-side lingotweaker-wasm engine.
 *
 * - Manual checking via "Check text" in the Tools menu, with progress
 *   feedback like the old plugin.
 * - Continuous checking ("Continuous checking" in the Tools → Spell/grammar
 *   checker submenu): per-document toggle, initialized from the user
 *   preference `grammar_check_continuous` when the document is opened.
 *   When on, the engine pack loads right away and the first check runs
 *   without user intervention; every document change then schedules a
 *   debounced full-document check and decorations reappear when results
 *   come back.
 * - Personal ignore lists ("Add to ignored words"/"Ignore rule" on an
 *   underline, edited via "Ignored words" in the same submenu): per-user
 *   lists shared across all languages, initialized from the preferences
 *   `grammar_check_ignored_words`/`_rules` and persisted through the
 *   host's `saveIgnoredWords`/`saveIgnoredRules` when available. They are
 *   applied as client-side filtering of the engine results (the wasm
 *   engine has no wordlist API); see matches.ts.
 * - The engine is loaded lazily per document language and runs in a Web
 *   Worker (see `client.ts`/`worker.ts`).
 */

import {FormatCitations} from "@fiduswriter/document/citations/format"
import {
    addAlert,
    addProgress,
    interpolate,
    noSpaceTmp,
    staticUrl
} from "fwtoolkit"
import type {EditorState, Transaction} from "prosemirror-state"

import {
    removeDecorations,
    setDecorations
} from "../state_plugins/grammar_check.js"
import {WRITE_ROLES} from "../types.js"
import {GrammarClient} from "./client.js"
import {grammarLanguage, GRAMMAR_LANGUAGE_CODES} from "./languages.js"
import {
    byteToTextRanges,
    filterBadPos,
    filterIgnored,
    filterPMMatches,
    IGNORED_RULES_MAX_ENTRIES,
    IGNORED_WORDS_MAX_ENTRIES,
    normalizeIgnoredList,
    readIgnored,
    translateMatches,
    type GrammarMatch,
    type GrammarMatchPM
} from "./matches.js"
import {getText, initSources, type GrammarSource} from "./text.js"
import type {Editor} from "../types.js"

const CHECK_DEBOUNCE_MS = 700

let stylesInjected = false

const sameList = (a: string[], b: string[]): boolean =>
    a.length === b.length && a.every((entry, index) => entry === b[index])

export class ModGrammar {
    editor: Editor
    client: GrammarClient
    supportedLanguages: string[]
    hasChecked: boolean
    sources: GrammarSource[] | false
    checkTimer: ReturnType<typeof setTimeout> | null
    /** Monotonically increased per run; stale async results are discarded. */
    runId: number
    /** Whether an engine load triggered by startCheck is in flight. */
    engineLoading: boolean
    /**
     * Whether this document is continuously checked. Initialized from the
     * user preference `grammar_check_continuous` when the document is
     * opened; the Tools → Spell/grammar checker menu toggles it per
     * document.
     */
    continuous: boolean
    /**
     * The user's ignored words (misspelling-kind matches covering exactly
     * such a term are not reported) and ignored rules (matches of these
     * rule ids are not reported). Per user, shared across all languages;
     * changed via the popup or the "Ignored words" dialog.
     */
    ignoredWords: string[]
    ignoredRules: string[]
    /** Lookup sets for filterIgnored (terms lowercased, rules exact). */
    ignoredWordsSet: Set<string>
    ignoredRulesSet: Set<string>

    constructor(editor: Editor) {
        editor.mod.grammar = this
        this.editor = editor
        this.client = new GrammarClient()
        this.supportedLanguages = GRAMMAR_LANGUAGE_CODES.slice()
        this.hasChecked = false
        this.sources = false
        this.checkTimer = null
        this.runId = 0
        this.engineLoading = false
        this.continuous =
            editor.app.config?.user?.preferences?.grammar_check_continuous ===
            true
        const ignored = readIgnored(editor.app.config?.user?.preferences)
        this.ignoredWords = ignored.words
        this.ignoredRules = ignored.rules
        this.ignoredWordsSet = new Set(
            ignored.words.map(word => word.toLowerCase())
        )
        this.ignoredRulesSet = new Set(ignored.rules)
        this.injectStyles()
        if (this.continuous) {
            // Run as soon as possible after the document has loaded: the
            // engine pack downloads in the background while the user
            // starts editing, then the first check runs on its own.
            this.startCheck()
        }
    }

    wavyUnderlineStyle(color: string): string {
        return noSpaceTmp`
        background: url("data:image/svg+xml;utf8,
            <svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version
                    ='1.1' viewBox='0 0 4 3' height='3' width='4' fill='%23${color}'>
                <path d='M 0.29035517,1.4291044 C -0.92396403,-0.1192701 -0.38579998,-0.3381018
                1 0.58454674,0.90550316 2.2240533,3.0067093 2.3955445,2.3505447 3.5620362,1.241
                324 4.0021271,0.82284017 4.4297825,0.77891784 4.0341445,1.4664179 3.104357,3.08
                21083 1.9261285,3.5148733 0.29035517,1.4291044 Z' />
            </svg>
        ") 50% 100% repeat-x transparent;
        padding-bottom: 0;
        display: inline;`
    }

    injectStyles(): void {
        if (stylesInjected) {
            return
        }
        stylesInjected = true
        const styleEl = document.createElement("style")

        styleEl.innerHTML = `.language {
            ${this.wavyUnderlineStyle("0000FF")}
        }
        .grammar {
            ${this.wavyUnderlineStyle("84b4a7")}
        }
        .spelling {
            ${this.wavyUnderlineStyle("FF0000")}
        }
        `
        document.head.appendChild(styleEl)
    }

    isSupported(language: string): boolean {
        return this.supportedLanguages.includes(language)
    }

    canCheck(): boolean {
        return (
            (WRITE_ROLES as string[]).includes(
                this.editor.docInfo.access_rights as string
            ) && !this.editor.app.isOffline()
        )
    }

    /**
     * URL of the gzipped data pack `pack`. Hosts install the
     * `lingotweaker-data-<pack>` npm packages they want to support and
     * serve the contents of their `packs/` directories under their static
     * root; `config.grammar_check_pack_base_url` (a URL ending in "/")
     * overrides that location. The full file path goes through
     * `staticUrl` so cache-busting query strings stay at the end of the
     * URL (e.g. `/static/lingotweaker-packs/en.pack.gz?v=1`).
     */
    packUrl(pack: string): string {
        const config = this.editor.app.config as
            {grammar_check_pack_base_url?: unknown} | undefined
        const baseUrl = config?.grammar_check_pack_base_url
        if (typeof baseUrl === "string" && baseUrl) {
            return `${baseUrl}${pack}.pack.gz`
        }
        return staticUrl(`lingotweaker-packs/${pack}.pack.gz`)
    }

    /** Load the engine for `language` if it is not loaded already. */
    ensureLoaded(language: string): Promise<void> {
        const languageDefinition = grammarLanguage(language)
        if (!languageDefinition) {
            return Promise.reject(new Error("unsupported language"))
        }
        return this.client.load(
            languageDefinition,
            this.packUrl(languageDefinition.pack)
        )
    }

    checkText(): void {
        if (!this.canCheck()) {
            return
        }
        const language = this.editor.view.state.doc.attrs.language
        const task = addProgress(
            "info",
            gettext("Spell/grammar check initialized."),
            {autoClose: 6000}
        )
        this.removeMarks()
        this.ensureLoaded(language)
            .then(() => {
                const runId = ++this.runId
                this.client.nextEpoch()
                if (!this.sources) {
                    this.sources = initSources(this.editor)
                }
                const sources = this.sources.slice()
                let completed = 0
                const updateProgress = () => {
                    completed++
                    const percentage = Math.round(
                        (completed / sources.length) * 100
                    )
                    task.update(
                        percentage,
                        interpolate(gettext("Checked %s of %s sections..."), [
                            completed,
                            sources.length
                        ])
                    )
                }
                return Promise.all(
                    sources.map(source =>
                        this.proofread(source, runId).then(updateProgress)
                    )
                )
            })
            .then(() =>
                task.update(100, gettext("Spell/grammar check finished."))
            )
            .catch(() => {
                task.close()
                addAlert(
                    "error",
                    gettext(
                        "The language pack for the document language could not be loaded."
                    )
                )
            })
    }

    /**
     * Check all sources. `rebuildSources` forces re-extraction of the
     * per-section text (continuous checking, where positions shift on
     * every edit); otherwise the source set is built once and reused so
     * unchanged sections keep their cached results, like the old plugin.
     */
    runCheck(rebuildSources: boolean): Promise<void> {
        if (rebuildSources) {
            this.sources = false
        }
        if (!this.sources) {
            this.sources = initSources(this.editor)
        }
        const runId = ++this.runId
        this.client.nextEpoch()
        const sources = this.sources.slice()
        return Promise.all(
            sources.map(source => this.proofread(source, runId))
        ).then(() => undefined)
    }

    /**
     * Load the engine (if needed) and run a full check. Used when
     * continuous checking starts — after the document has loaded, or when
     * the user turns the per-document setting on — so no further user
     * intervention is required. No-op while a load is already in flight
     * or the document language is not (yet) checkable.
     */
    startCheck(): void {
        if (this.engineLoading) {
            return
        }
        if (!this.canCheck()) {
            return
        }
        const language = this.editor.view.state.doc.attrs.language
        if (!this.isSupported(language)) {
            return
        }
        this.engineLoading = true
        this.ensureLoaded(language)
            .then(() => {
                this.engineLoading = false
                return this.runCheck(true)
            })
            .catch(() => {
                this.engineLoading = false
                addAlert(
                    "error",
                    gettext(
                        "The language pack for the document language could not be loaded."
                    )
                )
            })
    }

    /**
     * Turn continuous checking on or off for this document (the Tools →
     * Spell/grammar checker menu entry). The user preference only sets
     * the initial value when the document is opened.
     */
    setContinuous(on: boolean): void {
        if (this.continuous === on) {
            return
        }
        this.continuous = on
        if (on) {
            this.startCheck()
        } else {
            if (this.checkTimer) {
                clearTimeout(this.checkTimer)
                this.checkTimer = null
            }
            // Invalidate results still in flight and clear the marks.
            this.runId++
            this.client.nextEpoch()
            this.removeMarks()
        }
    }

    proofread(source: GrammarSource, runId: number): Promise<void> {
        source.posMap = []
        source.badPos = []
        const citationInfos: Array<{
            format: string
            references: Array<{id: number}>
        }> = []
        source.getNodes().forEach(topNode =>
            topNode.descendants(node => {
                if (node.type.name === "citation") {
                    citationInfos.push(
                        Object.assign({}, node.attrs, {
                            references: node.attrs.references.slice()
                        }) as {format: string; references: Array<{id: number}>}
                    )
                }
            })
        )
        let fm: {
            citationTexts: string[]
            init(): boolean | Promise<void>
        }
        let promise: boolean | Promise<void>
        if (citationInfos.length) {
            fm = new FormatCitations(
                this.editor.app.csl,
                citationInfos,
                this.editor.view.state.doc.attrs.citationstyle,
                "",
                this.editor.mod.db!.bibDB
            )
            promise = fm.init()
        } else {
            fm = {citationTexts: [], init: () => true}
            promise = true
        }

        return Promise.resolve(promise)
            .then(() => {
                const nodes = source.getNodes()
                const updatedText = nodes.length
                    ? getText({
                          nodes,
                          citationTexts: fm.citationTexts.slice(),
                          pos: 0,
                          posMap: source.posMap,
                          badPos: source.badPos
                      }).text
                    : ""
                if (!updatedText.trim().length) {
                    source.text = updatedText
                    return {matches: [] as GrammarMatch[]}
                } else if (updatedText === source.text) {
                    // The text has not changed since the last check, so we
                    // can use the same matches.
                    return {matches: source.matches ?? []}
                } else {
                    source.text = updatedText
                    return this.client
                        .check([source.text], runId)
                        .then(results => ({matches: results[0] ?? []}))
                }
            })
            .then(({matches}) => {
                if (runId !== this.runId) {
                    // A newer check is on the way; discard the stale result.
                    return undefined
                }
                const updatedText = getText({
                    nodes: source.getNodes(),
                    citationTexts: fm.citationTexts.slice()
                }).text
                if (source.text === updatedText) {
                    // No changes have been made while the check took place.
                    // The engine reports UTF-8 byte offsets; convert once
                    // so badPos filtering and posMap translation work in
                    // the same (UTF-16 text) unit.
                    source.matches = byteToTextRanges(
                        matches || [],
                        source.text ?? ""
                    )
                    let pmMatches: GrammarMatchPM[] = translateMatches(
                        filterIgnored(
                            filterBadPos(source.badPos, source.matches),
                            source.text ?? "",
                            this.ignoredWordsSet,
                            this.ignoredRulesSet
                        ),
                        source.getStartPos(),
                        source.posMap
                    )
                    pmMatches = filterPMMatches(
                        source.view.state.doc,
                        pmMatches
                    )
                    this.markMatches(source.view, pmMatches)
                    this.hasChecked = true
                    return undefined
                } else {
                    // something has changed, run the checker again.
                    return this.proofread(source, runId)
                }
            })
    }

    markMatches(view: GrammarSource["view"], matches: GrammarMatchPM[]): void {
        if (!matches.length) {
            return
        }
        const tr = setDecorations(view.state, matches)
        if (tr) {
            view.dispatch(tr)
        }
        this.hasChecked = true
    }

    /** Add the covered text of a misspelling match to the ignored words. */
    addIgnoredWord(term: string): void {
        this.setIgnoredWords(this.ignoredWords.concat([term]))
    }

    /** Do not report matches of `ruleId` from now on. */
    addIgnoredRule(ruleId: string): void {
        this.setIgnoredRules(this.ignoredRules.concat([ruleId]))
    }

    getIgnoredWords(): string[] {
        return this.ignoredWords.slice()
    }

    getIgnoredRules(): string[] {
        return this.ignoredRules.slice()
    }

    /**
     * Replace the ignored-words list (popup "add word" action and the
     * "Ignored words" dialog). Persists through the host's
     * `saveIgnoredWords` when available, then refreshes the marks.
     */
    setIgnoredWords(words: string[]): void {
        const normalized = normalizeIgnoredList(
            words,
            true,
            IGNORED_WORDS_MAX_ENTRIES
        )
        if (sameList(normalized, this.ignoredWords)) {
            return
        }
        this.ignoredWords = normalized
        this.ignoredWordsSet = new Set(
            normalized.map(word => word.toLowerCase())
        )
        this.saveIgnored("saveIgnoredWords", normalized)
        this.refreshMarksAfterIgnoreChange()
    }

    /** Replace the ignored-rules list (popup "Ignore rule" and dialog). */
    setIgnoredRules(rules: string[]): void {
        const normalized = normalizeIgnoredList(
            rules,
            false,
            IGNORED_RULES_MAX_ENTRIES
        )
        if (sameList(normalized, this.ignoredRules)) {
            return
        }
        this.ignoredRules = normalized
        this.ignoredRulesSet = new Set(normalized)
        this.saveIgnored("saveIgnoredRules", normalized)
        this.refreshMarksAfterIgnoreChange()
    }

    /**
     * Persist an ignore list through the matching optional host callback.
     * Failures are non-fatal: the local list stays in effect for this
     * session and the user is informed.
     */
    private saveIgnored(
        method: "saveIgnoredWords" | "saveIgnoredRules",
        entries: string[]
    ): void {
        const save = this.editor.app[method]
        if (!save) {
            return
        }
        save(entries).catch(() => {
            addAlert("error", gettext("The ignore lists could not be saved."))
        })
    }

    /**
     * Re-check after an ignore list change so the decorations match the
     * new lists (adding entries removes underlines, removing them
     * restores marks). The worker's per-text cache makes this cheap for
     * unchanged sections; positions are rebuilt so decorations land
     * correctly even after edits.
     */
    private refreshMarksAfterIgnoreChange(): void {
        if (!this.continuous && !this.hasChecked) {
            return
        }
        const language = this.editor.view.state.doc.attrs.language
        if (
            !this.isSupported(language) ||
            this.client.loadedLanguage !== language
        ) {
            return
        }
        this.removeMarks()
        this.runCheck(true).catch(error => console.error(error))
    }

    removeMarks(): void {
        this.removeMainDecos()
        this.removeFnDecos()
        this.hasChecked = false
    }

    removeFnDecos(): void {
        this.removeDecos(this.editor.mod.footnotes!.fnEditor.view)
    }

    removeMainDecos(): void {
        this.removeDecos(this.editor.view)
    }

    removeDecos(view: {
        state: EditorState
        dispatch(tr: Transaction): void
    }): void {
        const tr = removeDecorations(view.state)
        if (tr) {
            view.dispatch(tr)
        }
    }

    /** Debounced full-document check used by continuous checking. */
    scheduleCheck(): void {
        if (!this.continuous || !this.canCheck()) {
            return
        }
        const language = this.editor.view.state.doc.attrs.language
        if (
            !this.isSupported(language) ||
            this.client.loadedLanguage !== language
        ) {
            // Continuous checking never triggers a pack download; it only
            // runs once the engine for the document language is loaded.
            return
        }
        if (this.checkTimer) {
            clearTimeout(this.checkTimer)
        }
        this.checkTimer = setTimeout(() => {
            this.checkTimer = null
            this.runCheck(true).catch(error => console.error(error))
        }, CHECK_DEBOUNCE_MS)
    }

    /** Called by the grammar check plugins on every document change. */
    onDocChanged(): void {
        if (this.continuous && !this.client.loadedLanguage) {
            // The document (and thus its language) may only have become
            // available after this module was constructed — the editor is
            // built before the initial document content is applied.
            this.startCheck()
        }
        this.scheduleCheck()
    }

    /**
     * Called by the grammar check plugins when the document language
     * changes (clears marks in both editors).
     */
    onLanguageChange(): void {
        if (this.checkTimer) {
            clearTimeout(this.checkTimer)
            this.checkTimer = null
        }
        this.sources = false
        this.runId++
        this.removeMarks()
        if (this.continuous) {
            // Load the engine for the new language, then keep checking.
            this.startCheck()
            this.scheduleCheck()
        }
    }

    close(): void {
        if (this.checkTimer) {
            clearTimeout(this.checkTimer)
            this.checkTimer = null
        }
        this.runId++
        this.client.destroy()
    }
}
