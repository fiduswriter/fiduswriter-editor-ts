import {Plugin, PluginKey, Transaction} from "prosemirror-state"

import {LANGUAGES} from "@fiduswriter/document/schema/const"
import {CATS} from "@fiduswriter/document/schema/i18n"
import {setDocTitle} from "fwtoolkit"

import type {Editor} from "../types.js"

const key = new PluginKey("settings")

interface SettingsOptions {
    editor: Editor
}

export const settingsPlugin = (options: SettingsOptions) => {
    const fixSettings = (settings: Record<string, any>) => {
        const fixedSettings: Record<string, any> = Object.assign({}, settings)
        let changed = false

        Object.keys(settings).forEach(key => {
            const value = settings[key]
            switch (key) {
                case "documentstyle":
                    if (
                        !(
                            options.editor.mod.documentTemplate as any
                        ).documentStyles.find(
                            (d: {slug: string}) => d.slug === value
                        ) &&
                        (options.editor.mod.documentTemplate as any)
                            .documentStyles.length
                    ) {
                        fixedSettings[key] = (
                            options.editor.mod.documentTemplate as any
                        ).documentStyles[0].slug
                        changed = true
                    }
                    break
                case "citationstyle":
                    if (
                        !settings.citationstyles.includes(value) &&
                        settings.citationstyles.length
                    ) {
                        fixedSettings[key] = settings.citationstyles[0]
                        changed = true
                    }
                    break
            }
        })
        if (changed) {
            return fixedSettings
        } else {
            return false
        }
    }

    const updateSettings = (
        newSettings: Record<string, any>,
        oldSettings: Record<string, any>
    ) => {
        let settingsValid = true
        Object.keys(newSettings).forEach(key => {
            const newValue = newSettings[key]
            if (oldSettings[key] !== newValue) {
                switch (key) {
                    case "documentstyle":
                        if (newValue.length) {
                            updateDocStyleCSS(newValue)
                        } else {
                            settingsValid = false
                        }
                        break
                    case "citationstyle":
                        if (newValue.length) {
                            ;(options.editor.mod.citations as any).resetCitations()
                        } else {
                            settingsValid = false
                        }
                        break
                    case "language":
                        if (newValue.length) {
                            const lang = LANGUAGES.find(
                                lang => lang[0] === newValue
                            )
                            if (lang) {
                                document
                                    .querySelectorAll(".ProseMirror")
                                    .forEach(
                                        el =>
                                            ((el as HTMLElement).dir =
                                                lang[2] as "ltr" | "rtl")
                                    )
                                options.editor.docInfo.dir = lang[2] as
                                    | "ltr"
                                    | "rtl"
                                updateLanguageCSS(newValue)
                            }
                        } else {
                            settingsValid = false
                        }
                        break
                }
            }
        })
        return settingsValid
    }

    /** Update the stylesheet used for the docStyle
     */
    const updateDocStyleCSS = (docStyleId: string) => {
        const docStyle =
            (options.editor.mod.documentTemplate as any).documentStyles.find(
                (doc_style: {slug: string}) => doc_style.slug === docStyleId
            ) ||
            ((options.editor.mod.documentTemplate as any).documentStyles.length
                ? (options.editor.mod.documentTemplate as any)
                    .documentStyles[0]
                : {contents: "", documentstylefile_set: []})

        let docStyleCSS: string = docStyle.contents
        docStyle.documentstylefile_set.forEach(
            ([url, filename]: [string, string]) =>
                (docStyleCSS = docStyleCSS.replace(
                    new RegExp(filename, "g"),
                    url
                ))
        )

        let docStyleEl = document.getElementById("document-style")

        if (!docStyleEl) {
            docStyleEl = document.createElement("style")
            docStyleEl.id = "document-style"
            document.body.appendChild(docStyleEl)
        }

        docStyleEl.innerHTML = docStyleCSS

        // TODO: Find a way that is more reliable than a timeout to check
        // for font loading.
        window.setTimeout(() => {
            ;(options.editor.mod.marginboxes as any).updateDOM()
            ;(options.editor.mod.footnotes as any).layout.updateDOM()
        }, 250)
    }

    const updateLanguageCSS = (language: string) => {
        let langStyleEl = document.getElementById("language-style")
        if (!langStyleEl) {
            langStyleEl = document.createElement("style")
            langStyleEl.id = "language-style"
            document.body.appendChild(langStyleEl)
        }

        langStyleEl.innerHTML = `
        /* Numbering in editor */

        figure[data-category='figure'] figcaption::before {
            counter-increment: cat-figure;
            content: '${CATS["figure"][language]} ' counter(cat-figure);
        }

        #footnote-box-container figure[data-category='figure'] figcaption::before {
            content: '${CATS["figure"][language]} ' counter(cat-figure) 'A';
        }

        figure[data-category='equation'] figcaption::before {
            counter-increment: cat-equation;
            content: '${CATS["equation"][language]} ' counter(cat-equation);
        }

        #footnote-box-container figure[data-category='euqation'] figcaption::before {
            content: '${CATS["equation"][language]} ' counter(cat-equation) 'A';
        }

        figure[data-category='photo'] figcaption::before {
            counter-increment: cat-photo;
            content: '${CATS["photo"][language]} ' counter(cat-photo);
        }

        #footnote-box-container figure[data-category='photo'] figcaption::before {
            content: '${CATS["photo"][language]} ' counter(cat-photo) 'A';
        }

        figure[data-category='table'] figcaption::before,
        table[data-category='table'] caption::before {
            counter-increment: cat-table;
            content: '${CATS["table"][language]} ' counter(cat-table);
        }

        #footnote-box-container figure[data-category='table'] figcaption::before ,
        #footnote-box-container table[data-category='table'] caption::before {
            content: '${CATS["table"][language]} ' counter(cat-table) 'A';
        }`
    }

    return new Plugin({
        key,
        appendTransaction(trs, _oldState, newState) {
            // Ensure that there are always settings set.
            if (trs.every(tr => tr.getMeta("remote") || (tr as any).from > 0)) {
                // All transactions are remote. Give up.
                return null
            }
            const lastTr = trs[trs.length - 1]
            const attrs = lastTr.doc.attrs as Record<string, any>
            const fixedSettings = fixSettings(attrs)

            if (!fixedSettings) {
                return null
            }

            const tr = newState.tr
            Object.entries(fixedSettings).forEach(([key, value]) => {
                ;(tr as Transaction).setDocAttribute(key, value)
            })
            tr.setMeta("settings", true)

            return tr
        },
        view(view) {
            if (!updateSettings(view.state.doc.attrs as Record<string, any>, {})) {
                setTimeout(() => {
                    const tr = view.state.tr
                    const fixedSettings = fixSettings(
                        view.state.doc.attrs as Record<string, any>
                    )
                    if (!fixedSettings) {
                        return
                    }
                    Object.entries(fixedSettings).forEach(([key, value]) => {
                        ;(tr as Transaction).setDocAttribute(key, value)
                    })
                    tr.setMeta("settings", true)
                    view.dispatch(tr)
                }, 0)
            }
            return {
                update: (view, _prevState) => {
                    updateSettings(
                        view.state.doc.attrs as Record<string, any>,
                        _prevState.doc.attrs as Record<string, any>
                    )
                    setDocTitle(
                        view.state.doc.firstChild?.textContent || "",
                        options.editor.app as any
                    )
                }
            }
        }
    })
}
