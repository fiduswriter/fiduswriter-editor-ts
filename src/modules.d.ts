/**
 * Ambient type declarations for dependencies that do not ship their own types.
 */

declare module "prosemirror-suggestions" {
    import type {Plugin} from "prosemirror-state"
    import type {EditorView} from "prosemirror-view"

    export interface SuggestionRange {
        from: number
        to: number
    }

    export interface SuggestionMatch {
        range: SuggestionRange
        text: string
    }

    export type SuggestionMatcher = (
        $position: import("prosemirror-model").ResolvedPos
    ) => SuggestionMatch | undefined

    export function triggerCharacter(
        char: string,
        allowSpaces?: boolean
    ): SuggestionMatcher

    export interface SuggestionsPluginOptions {
        matcher?: SuggestionMatcher
        suggestionClass?: string
        onEnter?(args: {
            view: EditorView
            range: SuggestionRange
            text: string
        }): boolean
        onChange?(args: {
            view: EditorView
            range: SuggestionRange
            text: string
        }): boolean
        onExit?(args: {
            view: EditorView
            range: SuggestionRange
            text: string
        }): boolean
        onKeyDown?(args: {view: EditorView; event: KeyboardEvent}): boolean
        escapeOnSelectionChange?: boolean
        escapeKeys?: string[]
        debug?: boolean
    }

    export function suggestionsPlugin(
        options: SuggestionsPluginOptions
    ): Plugin
}

declare module "fix-utf8" {
    /**
     * Fix invalid UTF-8 byte sequences in the given string.
     */
    function fixUTF8(input: string): string
    export default fixUTF8
}

declare module "downloadjs" {
    function download(
        data: Blob | string,
        filename: string,
        mimeType?: string
    ): void
    export default download
}

declare module "diff" {
    export function diffChars(oldStr: string, newStr: string): Array<{
        value: string
        added?: boolean
        removed?: boolean
    }>
    export function diffWordsWithSpace(
        oldStr: string,
        newStr: string
    ): Array<{value: string; added?: boolean; removed?: boolean}>
}
