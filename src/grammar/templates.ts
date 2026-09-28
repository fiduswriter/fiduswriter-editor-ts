import {escapeText} from "fwtoolkit"

export const dialogTemplate = ({
    message,
    suggestions
}: {
    message: string
    suggestions: Array<{value: string}>
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
    </table>`
