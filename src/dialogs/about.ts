import {Dialog} from "fwtoolkit"

import type {Editor} from "../types.js"

/**
 * The "About Fidus Writer" dialog, reached through the Help menu.
 *
 * Shows the application version — supplied by the host through
 * `app.settings.VERSION` (the Fidus Writer server puts its own version there;
 * standalone hosts pass `StaticAppConfig.version`) — plus the information any
 * About dialog carries: what the application is, who holds the copyright and
 * under which license it is distributed, and where to find it online.
 */

/** The Fidus Writer website. */
export const FIDUSWRITER_URL = "https://fiduswriter.org"

export function openAboutDialog(editor: Editor): void {
    const version = editor.app.settings.VERSION as string | undefined
    const logoUrl = editor.app.settings.LOGO_URL as string | undefined
    const dialog = new Dialog({
        id: "about-fiduswriter",
        title: gettext("About Fidus Writer"),
        body: `
            <div class="fw-about-dialog">
                ${
                    logoUrl
                        ? `<p><img src="${escapeHtml(logoUrl)}" alt="${gettext(
                              "Fidus Writer"
                          )}" class="fw-about-logo"></p>`
                        : ""
                }
                <h3>${gettext("Fidus Writer")}</h3>
                <p>
                    ${gettext(
                        "An online collaborative editor for academics who need to use citations and/or formulas."
                    )}
                </p>
                ${
                    version
                        ? `<p>${gettext("Version")}: ${escapeHtml(version)}</p>`
                        : ""
                }
                <p>
                    ${gettext(
                        "Fidus Writer is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version."
                    )}
                </p>
                <p>
                    ${gettext("Copyright")} © 2013–2026 ${gettext(
                        "Johannes Wilm and Fidus Writer contributors"
                    )}
                </p>
                <p>
                    <a href="${FIDUSWRITER_URL}" target="_blank" rel="noopener">
                        ${FIDUSWRITER_URL}
                    </a>
                </p>
            </div>
        `,
        buttons: [{type: "close" as const}]
    })
    dialog.open()
}

/** The About dialog interpolates host-supplied values into HTML. */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}
