/**
 * Languages supported by the built-in spell/grammar checker. `code` is the
 * document language code as used by Fidus Writer's document schema (see
 * fiduswriter-document-ts `schema/document/structure.ts`), plus region-
 * suffixed variants that imported documents (DOCX `w:lang`) may carry.
 * `pack` is the data pack served by the host at
 * `staticUrl("lingotweaker-packs/<pack>.pack.gz")`, and `variant` the
 * variant resources (spelling dictionary, variant rules) when the code
 * selects anything but the pack's default variant.
 */

export interface GrammarLanguage {
    code: string
    pack: string
    variant?: string
}

export const GRAMMAR_LANGUAGES: GrammarLanguage[] = [
    {code: "ast-ES", pack: "ast"},
    {code: "ast", pack: "ast"},
    {code: "br-FR", pack: "br"},
    {code: "br", pack: "br"},
    {code: "ca-ES", pack: "ca"},
    {code: "ca", pack: "ca"},
    {code: "ca-ES-Valencia", pack: "ca"},
    {code: "da", pack: "da"},
    {code: "de-DE", pack: "de"},
    {code: "de-AT", pack: "de", variant: "de-AT"},
    {code: "de-CH", pack: "de", variant: "de-CH"},
    {code: "de-AU", pack: "de"},
    {code: "en-US", pack: "en"},
    {code: "en-GB", pack: "en", variant: "en-GB"},
    {code: "en-AU", pack: "en"},
    {code: "en-CA", pack: "en"},
    {code: "en-NZ", pack: "en"},
    {code: "en-ZA", pack: "en"},
    {code: "es-ES", pack: "es"},
    {code: "es", pack: "es"},
    {code: "eo", pack: "eo"},
    {code: "fr", pack: "fr"},
    {code: "gl", pack: "gl"},
    {code: "is-IS", pack: "is"},
    {code: "is", pack: "is"},
    {code: "it-IT", pack: "it"},
    {code: "it", pack: "it"},
    {code: "lt-LT", pack: "lt"},
    {code: "lt", pack: "lt"},
    {code: "nl-NL", pack: "nl"},
    {code: "nl", pack: "nl"},
    {code: "no", pack: "no"},
    {code: "nb-NO", pack: "no"},
    {code: "nn", pack: "nn"},
    {code: "nn-NO", pack: "nn"},
    {code: "pl", pack: "pl"},
    {code: "pt-PT", pack: "pt"},
    {code: "pt-BR", pack: "pt", variant: "pt-BR"},
    {code: "ro", pack: "ro"},
    {code: "sk", pack: "sk"},
    {code: "sl", pack: "sl"},
    {code: "sv", pack: "sv"},
    {code: "tl-PH", pack: "tl"},
    {code: "tl", pack: "tl"},
    {code: "el", pack: "el"},
    {code: "be-BY", pack: "be"},
    {code: "be", pack: "be"},
    {code: "ru-RU", pack: "ru"},
    {code: "ru", pack: "ru"},
    {code: "sr-RS", pack: "sr"},
    {code: "sr-SP-Cy", pack: "sr"},
    {code: "sr-SP-Lt", pack: "sr"},
    {code: "uk-UA", pack: "uk"},
    {code: "uk", pack: "uk"},
    {code: "ar", pack: "ar"},
    {code: "fa-IR", pack: "fa"},
    {code: "fa", pack: "fa"},
    {code: "ta-IN", pack: "ta"},
    {code: "ta", pack: "ta"},
    {code: "ml-IN", pack: "ml"},
    {code: "ml", pack: "ml"},
    {code: "km-KH", pack: "km"},
    {code: "km", pack: "km"},
    {code: "zh-CN", pack: "zh"},
    {code: "ja-JP", pack: "ja"},
    {code: "ja", pack: "ja"}
]

export const GRAMMAR_LANGUAGE_CODES: string[] = GRAMMAR_LANGUAGES.map(
    language => language.code
)

export function grammarLanguage(code: string): GrammarLanguage | undefined {
    return GRAMMAR_LANGUAGES.find(language => language.code === code)
}
