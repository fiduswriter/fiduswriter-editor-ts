import {escapeText, interpolate} from "fwtoolkit"

export const dialogTemplate = ({
    message,
    suggestions,
    word,
    misspelling
}: {
    message: string
    suggestions: Array<{value: string}>
    /** Covered text of the match; only used for misspellings. */
    word?: string
    /** Whether the match is misspelling-kind (drives the action button). */
    misspelling: boolean
}): string =>
    `<table class="fw-dialog-table">
        <tr><td>
            <p>${escapeText(message)}</p>
        </td></tr>
    ${
        suggestions.length
            ? `<tr><td>
            <p>${gettext("Replace with")}:</p>
        </td></tr>`
            : ""
    }
    ${suggestions
        .map(
            (suggestion, index) =>
                `<tr><td><button class="replacement fw-button fw-white fw-large" style="width: 296px;" data-id="${index}">
                ${escapeText(suggestion.value)}
            </button></td></tr>`
        )
        .join("")}
    ${
        misspelling && word
            ? `<tr><td><button class="add-ignored fw-button fw-white fw-large" style="width: 296px;">
                ${interpolate(gettext('Add "%s" to ignored words'), [
                    escapeText(word)
                ])}
            </button></td></tr>`
            : ""
    }
    ${
        !misspelling
            ? `<tr><td><button class="add-ignored-rule fw-button fw-white fw-large" style="width: 296px;" title="${escapeText(
                  gettext("Do not report this rule again, in any document.")
              )}">
                ${gettext("Ignore rule")}
            </button></td></tr>`
            : ""
    }
    </table>`
