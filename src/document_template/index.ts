import {
    Dialog,
    addAlert,
    addProgress,
    escapeText,
    get,
    shortFileTitle
} from "fwtoolkit"
import {E2EEKeyManager} from "fwtoolkit/e2ee/key-manager"
import {
    createPasswordDialog,
    enterPasswordDialog
} from "fwtoolkit/e2ee/password-dialog"

import type {Editor} from "../types.js"
import {SaveCopy} from "../exporter/native/index.js"

export {serializeHelp} from "./schema.js"

interface DocumentTemplate {
    title: string
}

interface ExportTemplate {
    title: string
    file_type: "docx" | "odt"
    template_file: string
}

interface DocumentStyle {
    title: string
    slug: string
    documentstylefile_set: Array<[string, string]>
}

export class ModDocumentTemplate {
    editor: Editor
    exportTemplates: ExportTemplate[]
    documentStyles: DocumentStyle[]
    documentTemplates: Record<string, DocumentTemplate>
    citationStyles: Record<string, string>

    constructor(editor: Editor) {
        editor.mod.documentTemplate = this
        this.editor = editor
        this.exportTemplates = []
        this.documentStyles = []
        this.documentTemplates = {}
        this.citationStyles = {}
    }

    setStyles(styles: {
        export_templates: ExportTemplate[]
        document_styles: DocumentStyle[]
        document_templates: Record<string, DocumentTemplate>
    }): void {
        this.exportTemplates = styles.export_templates
        this.documentStyles = styles.document_styles
        this.documentTemplates = styles.document_templates
        this.addExportTemplateMenuEntries()
        this.addDocumentStylesMenuEntries()
        if (Object.keys(this.documentTemplates).length) {
            this.addCopyAsMenuEntry()
        }
        if ((this.editor.menu as any).headerView) {
            ;(this.editor.menu as any).headerView.update()
        }
        //Cache the template files using Service Worker
        for (const key in styles.export_templates) {
            const template = styles.export_templates[key]
            get(template.template_file)
        }
        //Cache the required font related files too!
        this.documentStyles.forEach(docStyle => {
            docStyle.documentstylefile_set.forEach(([url, _filename]) =>
                get(url)
            )
        })
    }

    addDocPartSettings(): void {
        const hideableDocParts: Array<{
            title: string
            id: string
            index: number
        }> = []
        this.editor.view.state.doc.forEach((child, _offset, index) => {
            if (child.attrs.optional) {
                hideableDocParts.push({
                    title: child.attrs.title,
                    id: child.attrs.id,
                    index
                })
            }
        })
        if (!hideableDocParts.length) {
            return
        }
        const metadataMenu = {
            id: "metadata",
            title: gettext("Optional sections"),
            type: "menu",
            tooltip: gettext("Choose which optional sections to enable."),
            order: 0,
            disabled: (editor: Editor) => editor.docInfo.access_rights !== "write",
            content: hideableDocParts.map(docPart => ({
                title: docPart.title,
                type: "setting",
                tooltip: `${gettext("Show/hide")} ${docPart.title}`,
                order: docPart.index,
                action: (editor: Editor) => {
                    let offset = 0
                    for (let i = 0; i < docPart.index; i++) {
                        offset += editor.view.state.doc.child(i).nodeSize
                    }
                    const node = editor.view.state.doc.child(docPart.index)
                    editor.view.dispatch(
                        editor.view.state.tr
                            .setNodeMarkup(
                                offset,
                                null,
                                Object.assign({}, node.attrs, {
                                    hidden: !node.attrs.hidden
                                })
                            )
                            .setMeta("settings", true)
                    )
                },
                selected: (editor: Editor) =>
                    !editor.view.state.doc.child(docPart.index).attrs.hidden
            }))
        }
        const headerbarModel = (this.editor.menu as any).headerbarModel
        const settingsMenu = headerbarModel.content.find(
            (menu: any) => menu.id === "settings"
        )
        settingsMenu.content = settingsMenu.content.filter(
            (item: any) => item.id !== "metadata"
        )
        settingsMenu.content.unshift(metadataMenu)
    }

    addCopyAsMenuEntry(): void {
        const headerbarModel = (this.editor.menu as any).headerbarModel
        const fileMenu = headerbarModel.content.find(
            (menu: any) => menu.id === "file"
        )
        // Cancel if run already
        if (fileMenu.content.find((menuItem: any) => menuItem.id === "copy_as")) {
            return
        }
        fileMenu.content.push({
            id: "copy_as",
            title: gettext("Create copy as ..."),
            type: "action",
            tooltip: gettext(
                "Create copy of the current document with a specific template."
            ),
            order: 3.5,
            action: (editor: Editor) => {
                const isE2EE = (editor.docInfo as any).e2ee
                const e2eeMode = (editor.app.settings as any).E2EE_MODE
                const canToggleE2EE =
                    e2eeMode === "enabled" ||
                    (e2eeMode === "required" && !isE2EE) ||
                    (e2eeMode === "disabled" && isE2EE)

                let e2eeHtml = ""
                if (canToggleE2EE) {
                    e2eeHtml = `
                        <div class="e2ee-copy-toggle" style="margin-top: 15px;">
                            <label>
                                <input type="checkbox" id="e2ee-copy-toggle" ${e2eeMode === "required" || isE2EE ? "checked" : ""}>
                                ${gettext("Encrypt the copy")}
                            </label>
                        </div>
                    `
                }

                const selectTemplateDialog = new Dialog({
                    title: gettext("Choose document template"),
                    body: `<p>
                        ${gettext("Select document template for copy.")}
                        </p>
                        <select class="fw-button fw-large fw-light">${Object.entries(
                            (editor.mod as any).documentTemplate.documentTemplates
                        )
                            .map(
                                ([importId, dt]) =>
                                    `<option value="${escapeText(importId)}">${escapeText((dt as DocumentTemplate).title)}</option>`
                            )
                            .join("")}</select>
                        ${e2eeHtml}`,
                    buttons: [
                        {
                            text: gettext("Copy"),
                            classes: "fw-dark",
                            click: () => {
                                if (editor.app.isOffline()) {
                                    addAlert(
                                        "error",
                                        "You are offline. Please try again after you are online."
                                    )
                                    selectTemplateDialog.close()
                                    return
                                }

                                const targetE2EE =
                                    canToggleE2EE &&
                                    (
                                        selectTemplateDialog.dialogEl.querySelector(
                                            "#e2ee-copy-toggle"
                                        ) as HTMLInputElement | null
                                    )?.checked

                                const doCopy = (e2eeOptions: any) => {
                                    const copier = new SaveCopy(
                                        editor.getDoc() as any,
                                        (editor.mod.db as any).bibDB,
                                        (editor.mod.db as any).imageDB,
                                        editor.user,
                                        (
                                            selectTemplateDialog.dialogEl.querySelector(
                                                "select"
                                            ) as HTMLSelectElement
                                        ).value as any,
                                        e2eeOptions
                                    )
                                    copier
                                        .init()
                                        .then(({docInfo}: any) => {
                                            const url = targetE2EE
                                                ? `/document/${docInfo.id}/?e2ee=1`
                                                : `/document/${docInfo.id}/`
                                            ;(editor.app as any).goTo(url)
                                        })
                                        .catch(() => false)
                                    selectTemplateDialog.close()
                                }

                                if (isE2EE && !targetE2EE) {
                                    // Decrypting: need source key
                                    if (editor.e2ee && editor.e2ee.key) {
                                        doCopy({
                                            sourceKey: editor.e2ee.key,
                                            targetE2EE: false
                                        })
                                    } else {
                                        enterPasswordDialog(async (password: string) => {
                                            try {
                                                const key =
                                                    await E2EEKeyManager.deriveKey(
                                                        password,
                                                        new Uint8Array(
                                                            atob(
                                                                (editor.docInfo as any)
                                                                    .e2ee_salt
                                                            )
                                                                .split("")
                                                                .map(c =>
                                                                    c.charCodeAt(
                                                                        0
                                                                    )
                                                                )
                                                        ),
                                                        (editor.docInfo as any)
                                                            .e2ee_iterations ||
                                                            600000
                                                    )
                                                doCopy({
                                                    sourceKey: key,
                                                    targetE2EE: false
                                                })
                                            } catch (_err) {
                                                addAlert(
                                                    "error",
                                                    gettext(
                                                        "Incorrect password."
                                                    )
                                                )
                                            }
                                        })
                                    }
                                } else if (!isE2EE && targetE2EE) {
                                    // Encrypting: need new password
                                    createPasswordDialog((password: string) => {
                                        doCopy({
                                            targetE2EE: true,
                                            targetPassword: password
                                        })
                                    })
                                } else if (isE2EE && targetE2EE) {
                                    // E2EE -> E2EE: need source key, then new password
                                    const handlePasswords = (sourceKey: any) => {
                                        createPasswordDialog((password: string) => {
                                            doCopy({
                                                sourceKey: sourceKey,
                                                targetE2EE: true,
                                                targetPassword: password
                                            })
                                        })
                                    }
                                    if (editor.e2ee && editor.e2ee.key) {
                                        handlePasswords(editor.e2ee.key)
                                    } else {
                                        enterPasswordDialog(async (password: string) => {
                                            try {
                                                const key =
                                                    await E2EEKeyManager.deriveKey(
                                                        password,
                                                        new Uint8Array(
                                                            atob(
                                                                (editor.docInfo as any)
                                                                    .e2ee_salt
                                                            )
                                                                .split("")
                                                                .map(c =>
                                                                    c.charCodeAt(
                                                                        0
                                                                    )
                                                                )
                                                        ),
                                                        (editor.docInfo as any)
                                                            .e2ee_iterations ||
                                                            600000
                                                    )
                                                handlePasswords(key)
                                            } catch (_err) {
                                                addAlert(
                                                    "error",
                                                    gettext(
                                                        "Incorrect password."
                                                    )
                                                )
                                            }
                                        })
                                    }
                                } else {
                                    // Plain -> plain
                                    doCopy(null)
                                }
                            }
                        },
                        {
                            type: "cancel"
                        }
                    ]
                })
                selectTemplateDialog.open()
            },
            disabled: (editor: Editor) => editor.app.isOffline()
        })

        fileMenu.content = fileMenu.content.sort(
            (a: any, b: any) => a.order - b.order
        )
    }

    addExportTemplateMenuEntries(): void {
        const headerbarModel = (this.editor.menu as any).headerbarModel
        const exportMenu = headerbarModel.content.find(
            (menu: any) => menu.id === "export"
        )
        // Remove any previous entries in case we run this a second time
        exportMenu.content = exportMenu.content.filter(
            (menuItem: any) => menuItem.class !== "export_template"
        )
        // Find highest menu item under 100 to put templates at end of native exporter options.
        let order = 1
        exportMenu.content.forEach((menuItem: any) => {
            if (menuItem.order < 100 && menuItem.order > order) {
                order = menuItem.order
            }
        })
        const exportMenuEntries = this.exportTemplates.map(template => {
            if (template.file_type === "docx") {
                return {
                    class: "export_template",
                    title: `${template.title} (DOCX)`,
                    type: "action",
                    order: ++order,
                    tooltip: gettext(
                        "Export the document to a DOCX file with the given template."
                    ),
                    action: (editor: Editor) => {
                        import(
                            "@fiduswriter/document/exporter/docx/index"
                        ).then(({DOCXExporter}: any) => {
                            const doc = editor.getDoc() as any
                            const title = shortFileTitle(
                                doc.title,
                                doc.path || ""
                            )
                            const task = addProgress(
                                "info",
                                `${title}: ${gettext("Exporting DOCX...")}`,
                                {autoClose: 6000}
                            )
                            const exporter = new DOCXExporter(
                                doc,
                                template.template_file,
                                (editor.mod.db as any).bibDB,
                                (editor.mod.db as any).imageDB,
                                editor.app.csl
                            )
                            exporter.progressCallback = (
                                message: string,
                                percentage: number
                            ) => task.update(percentage, message)
                            exporter.init()
                        })
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                }
            } else {
                return {
                    class: "export_template",
                    title: `${template.title} (ODT)`,
                    type: "action",
                    order: ++order,
                    tooltip: gettext(
                        "Export the document to an ODT file with the given template."
                    ),
                    action: (editor: Editor) => {
                        import("@fiduswriter/document/exporter/odt/index").then(
                            ({ODTExporter}: any) => {
                                const doc = editor.getDoc() as any
                                const title = shortFileTitle(
                                    doc.title,
                                    doc.path || ""
                                )
                                const task = addProgress(
                                    "info",
                                    `${title}: ${gettext("Exporting ODT...")}`,
                                    {autoClose: 6000}
                                )
                                const exporter = new ODTExporter(
                                    doc,
                                    template.template_file,
                                    (editor.mod.db as any).bibDB,
                                    (editor.mod.db as any).imageDB,
                                    editor.app.csl
                                )
                                exporter.progressCallback = (
                                    message: string,
                                    percentage: number
                                ) => task.update(percentage, message)
                                exporter.init()
                            }
                        )
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                }
            }
        })
        exportMenu.content = exportMenu.content.concat(exportMenuEntries)
        exportMenu.content = exportMenu.content.sort(
            (a: any, b: any) => a.order - b.order
        )
    }

    addDocumentStylesMenuEntries(): void {
        const headerbarModel = (this.editor.menu as any).headerbarModel
        const settingsMenu = headerbarModel.content.find(
                (menu: any) => menu.id === "settings"
            ),
            documentStyleMenu = settingsMenu.content.find(
                (menu: any) => menu.id === "document_style"
            )

        documentStyleMenu.content = this.documentStyles.map(docStyle => ({
            title: docStyle.title,
            type: "setting",
            action: (editor: Editor) => {
                editor.view.dispatch(
                    editor.view.state.tr
                        .setDocAttribute("documentstyle", docStyle.slug)
                        .setMeta("settings", true)
                )
            },
            selected: (editor: Editor) =>
                editor.view.state.doc.attrs.documentstyle === docStyle.slug,
            disabled: (editor: Editor) => editor.app.isOffline()
        }))
    }

    getCitationStyles(): Promise<void> {
        return (this.editor.app.csl as any)
            .getStyles()
            .then((styles: Record<string, string>) => {
                this.citationStyles = styles
            })
    }

    private citationStyleFallbackTitle(citationstyle: string): string {
        if (citationstyle.includes("author-date")) {
            return "Chicago (author-date) [fallback style]"
        }
        if (citationstyle.includes("note")) {
            return "Chicago (notes) [fallback style]"
        }
        return "Chicago (author-date) [fallback style]"
    }

    private citationStyleFallbackId(citationstyle: string): string {
        if (citationstyle.includes("note")) {
            return "chicago-notes-bibliography"
        }
        return "chicago-author-date"
    }

    addCitationStylesMenuEntries(): void {
        const headerbarModel = (this.editor.menu as any).headerbarModel
        const settingsMenu = headerbarModel.content.find(
                (menu: any) => menu.id === "settings"
            ),
            citationStyleMenu = settingsMenu.content.find(
                (menu: any) => menu.id === "citation_style"
            )
        if (citationStyleMenu) {
            citationStyleMenu.content =
                this.editor.view.state.doc.attrs.citationstyles.map(
                    (citationstyle: string) => ({
                        title: this.citationStyles[citationstyle] ||
                            this.citationStyleFallbackTitle(citationstyle),
                        type: "setting",
                        action: (editor: Editor) => {
                            const actualStyle = this.citationStyles[citationstyle]
                                ? citationstyle
                                : this.citationStyleFallbackId(citationstyle)
                            editor.view.dispatch(
                                editor.view.state.tr
                                    .setDocAttribute(
                                        "citationstyle",
                                        actualStyle
                                    )
                                    .setMeta("settings", true)
                            )
                        },
                        selected: (editor: Editor) => {
                            const current = editor.view.state.doc.attrs.citationstyle
                            return current === citationstyle ||
                                (!this.citationStyles[citationstyle] &&
                                    current === this.citationStyleFallbackId(citationstyle))
                        }
                    })
                )
        }
    }
}
