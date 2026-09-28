/**
 * Languages supported by the built-in spell/grammar checker, ported from
 * the LingoTweaker demo's language list. `code` is the document language
 * code, `pack` the data pack fetched from the release CDN, and `variant`
 * the variant resources (spelling dictionary, variant rules) when the
 * code selects anything but the pack's default variant.
 */

export interface GrammarLanguage {
    code: string
    pack: string
    variant?: string
}

export const GRAMMAR_LANGUAGES: GrammarLanguage[] = [
    {code: "ast-ES", pack: "ast"},
    {code: "gn-ES", pack: "gn"},
    {code: "br-FR", pack: "br"},
    {code: "ca-ES", pack: "ca"},
    {code: "da", pack: "da"},
    {code: "de-DE", pack: "de"},
    {code: "de-AT", pack: "de", variant: "de-AT"},
    {code: "de-CH", pack: "de", variant: "de-CH"},
    {
        code: "de-DE-x-simple-language",
        pack: "de",
        variant: "de-DE-x-simple-language"
    },
    {code: "en-US", pack: "en"},
    {code: "en-GB", pack: "en", variant: "en-GB"},
    {code: "es-ES", pack: "es"},
    {code: "eo", pack: "eo"},
    {code: "fr", pack: "fr"},
    {code: "gl", pack: "gl"},
    {code: "is-IS", pack: "is"},
    {code: "it-IT", pack: "it"},
    {code: "lt-LT", pack: "lt"},
    {code: "nl-NL", pack: "nl"},
    {code: "nrd", pack: "nrd"},
    {code: "no", pack: "no"},
    {code: "nn", pack: "nn"},
    {code: "pl", pack: "pl"},
    {code: "pt-PT", pack: "pt"},
    {code: "pt-BR", pack: "pt", variant: "pt-BR"},
    {code: "crh-UA", pack: "crh"},
    {code: "ro", pack: "ro"},
    {code: "sk", pack: "sk"},
    {code: "sl", pack: "sl"},
    {code: "sv", pack: "sv"},
    {code: "tl-PH", pack: "tl"},
    {code: "el", pack: "el"},
    {code: "be-BY", pack: "be"},
    {code: "ru-RU", pack: "ru"},
    {code: "sr-RS", pack: "sr"},
    {code: "uk-UA", pack: "uk"},
    {code: "ar", pack: "ar"},
    {code: "fa-IR", pack: "fa"},
    {code: "ta-IN", pack: "ta"},
    {code: "ml-IN", pack: "ml"},
    {code: "km-KH", pack: "km"},
    {code: "zh-CN", pack: "zh"},
    {code: "ja-JP", pack: "ja"}
]

export const GRAMMAR_LANGUAGE_CODES: string[] = GRAMMAR_LANGUAGES.map(
    language => language.code
)

export function grammarLanguage(code: string): GrammarLanguage | undefined {
    return GRAMMAR_LANGUAGES.find(language => language.code === code)
}
