import {
    Dialog,
    addAlert,
    addProgress,
    shortFileTitle
} from "fwtoolkit"
import type {BibDB, ExportDoc, ImageDB} from "@fiduswriter/document"
import {CopyrightDialog} from "../../copyright_dialog/index.js"
import {DocumentAccessRightsDialog} from "../../documents/access_rights/index.js"
import {RequestAccessDialog} from "../../documents/access_rights/request_access_dialog.js"
import {SaveCopy, SaveRevision} from "../../exporter/native/index.js"
import {ExportFidusFile} from "../../exporter/native/file.js"
import {
    LanguageDialog,
    PdfExportDialog,
    RevisionDialog,
    HtmlExportDialog,
    EpubExportDialog
} from "../../dialogs/index.js"
import {E2EEKeyManager} from "fwtoolkit/e2ee/key-manager"
import {PassphraseManager} from "fwtoolkit/e2ee/passphrase-manager"
import {changePasswordDialog} from "fwtoolkit/e2ee/password-dialog"
import {
    KeyBindingsDialog,
    SearchReplaceDialog,
    WordCountDialog
} from "../../tools/index.js"
import type {Editor} from "../../types.js"

interface AccessRightLike {
    holder?: {
        type?: string
        id?: number
        name?: string
    }
    rights?: string
}

interface DocumentStyle {
    slug: string
    contents: string
    documentstylefile_set: Array<[string, string]>
}

interface DocumentTemplateLike {
    documentStyles: DocumentStyle[]
}

interface TrackLike {
    acceptAll(): void
    rejectAll(): void
}

function getDB(editor: Editor): {
    bibDB: BibDB
    imageDB: ImageDB
} {
    return editor.mod.db as {bibDB: BibDB; imageDB: ImageDB}
}

function getDocumentTemplate(editor: Editor): DocumentTemplateLike {
    return editor.mod.documentTemplate as unknown as DocumentTemplateLike
}

function getTrack(editor: Editor): TrackLike {
    return editor.mod.track as TrackLike
}

function getExportDoc(editor: Editor, options?: {changes?: string}): ExportDoc {
    return editor.getDoc(options) as unknown as ExportDoc
}

const exportProgress = (doc: {title: string; path?: string}) => {
    const title = shortFileTitle(doc.title, doc.path || "")
    const task = addProgress("info", `${title}: ${gettext("Exporting...")}`, {
        autoClose: 6000
    })
    return (message: string, percentage?: number | null) =>
        task.update(percentage ?? null, message)
}

const showRequestAccess = (editor: Editor): boolean =>
    editor.user.is_authenticated === true &&
    !editor.docInfo.is_owner &&
    (Boolean(editor.docInfo.token) ||
        (Boolean(editor.docInfo.access_rights) &&
            editor.docInfo.access_rights !== "write"))

const languageItem = (
    language: string,
    name: string,
    order: number
): {
    title: string
    type: string
    order: number
    action: (editor: Editor) => void
    selected: (editor: Editor) => boolean
    available: (editor: Editor) => boolean
} => ({
    title: name,
    type: "setting",
    order,
    action: (editor: Editor) => {
        editor.view.dispatch(
            editor.view.state.tr
                .setDocAttribute("language", language)
                .setMeta("settings", true)
        )
    },
    selected: (editor: Editor) => {
        return editor.view.state.doc.attrs.language === language
    },
    available: (editor: Editor) => {
        return editor.view.state.doc.attrs.languages.includes(language)
    }
})

export const headerbarModel = () => ({
    open: window.innerWidth > 500, // Whether the menu is shown at all.
    content: [
        {
            id: "file",
            title: gettext("File"),
            tooltip: gettext("File handling"),
            type: "menu",
            keys: "Alt-f",
            order: 0,
            content: [
                {
                    title: (editor: Editor) =>
                        showRequestAccess(editor)
                            ? gettext("Request Access")
                            : gettext("Share"),
                    type: "action",
                    //icon: 'share',
                    tooltip: (editor: Editor) =>
                        showRequestAccess(editor)
                            ? gettext("Request to be added as a collaborator.")
                            : gettext("Share the document with other users."),
                    order: 0,
                    action: (editor: Editor) => {
                        if (showRequestAccess(editor)) {
                            // Request higher access rights from the document owner
                            const requestAccessDialog = new RequestAccessDialog(
                                editor.docInfo.id as number,
                                editor.docInfo.access_rights || "",
                                editor.app.apiConnectors.document,
                                Boolean(editor.docInfo.token)
                            )
                            requestAccessDialog.open()
                            return
                        }
                        const onShareSuccess = async (
                            newAccessRights: AccessRightLike[]
                        ) => {
                            // Share the document password with newly-added user recipients.
                            if (
                                editor.e2ee?.password &&
                                PassphraseManager.hasKeysInSession()
                            ) {
                                const userRecipients = newAccessRights.filter(
                                    ar =>
                                        ar.holder?.type === "user" &&
                                        ar.rights !== "delete"
                                )
                                const noPassphraseUsers: string[] = []
                                for (const ar of userRecipients) {
                                    try {
                                        const holderId = ar.holder?.id as number
                                        const hasKeys =
                                            await PassphraseManager.userHasEncryptionKeys(
                                                holderId
                                            )
                                        if (hasKeys) {
                                            // Recipient has passphrase keys —
                                            // encrypt document password with their public key.
                                            await PassphraseManager.saveDocumentPassword(
                                                editor.docInfo.id as number,
                                                editor.e2ee.password,
                                                holderId,
                                                "user",
                                                false
                                            )
                                        } else {
                                            noPassphraseUsers.push(
                                                ar.holder?.name || "user"
                                            )
                                        }
                                    } catch (_e) {
                                        noPassphraseUsers.push(
                                            ar.holder?.name || "user"
                                        )
                                    }
                                }

                                if (noPassphraseUsers.length > 0) {
                                    const passwordDialog: Dialog = new Dialog({
                                        title: gettext(
                                            "Share Document Password"
                                        ),
                                        id: "share-password-dialog",
                                        width: 500,
                                        body: `<p>${gettext(
                                            "The following users don't have passphrase encryption. Please share the document password with them directly."
                                        )}</p><ul>${noPassphraseUsers
                                            .map(
                                                name =>
                                                    `<li><strong>${name}</strong>: <code>${editor.e2ee?.password}</code></li>`
                                            )
                                            .join("")}</ul>`,
                                        buttons: [
                                            {
                                                text: gettext("Close"),
                                                classes: "fw-dark",
                                                click: () =>
                                                    passwordDialog.close()
                                            }
                                        ]
                                    })
                                    passwordDialog.open()
                                }
                            }
                        }
                        const shareDialog = new DocumentAccessRightsDialog(
                            [editor.docInfo.id as number],
                            editor.docInfo.owner?.contacts || [],
                            contactData => {
                                editor.docInfo.owner?.contacts.push(contactData)
                            },
                            editor.e2ee?.encrypted || false,
                            editor.e2ee?.password || "",
                            onShareSuccess,
                            editor.app.settings,
                            editor.docInfo.is_owner,
                            editor.app.apiConnectors.contacts,
                            editor.app.apiConnectors.document
                        )
                        shareDialog.init()
                    },
                    available: (editor: Editor) => {
                        if (editor.app.settings.EDITOR_SAVE_MODE === "external") {
                            return false
                        }
                        if (!editor.user.is_authenticated) {
                            return true
                        }
                        if (editor.docInfo.is_owner) {
                            return true
                        }
                        if (editor.docInfo.token) {
                            return true
                        }
                        if (!editor.docInfo.access_rights) {
                            return false
                        }
                        return editor.docInfo.access_rights !== "write"
                    },
                    disabled: (editor: Editor) => {
                        return (
                            editor.app.isOffline() ||
                            !editor.user.is_authenticated ||
                            !editor.docInfo.owner ||
                            (!editor.docInfo.is_owner &&
                                !editor.docInfo.token &&
                                editor.docInfo.access_rights === "write")
                        )
                    }
                },
                {
                    title: (editor: Editor) =>
                        editor.user.is_authenticated
                            ? gettext("Close")
                            : gettext("Sign up / Log in"),
                    type: "action",
                    //icon: 'times-circle',
                    tooltip: (editor: Editor) =>
                        editor.user.is_authenticated
                            ? gettext(
                                  "Close the document and return to the document overview menu."
                              )
                            : gettext("Sign up for an account or log in."),
                    order: 1,
                    available: (editor: Editor) =>
                        editor.app.settings.EDITOR_ONLY_MODE !== true,
                    action: (editor: Editor) => {
                        if (editor.user.is_authenticated) {
                            const folderPath = editor.docInfo.path.slice(
                                0,
                                editor.docInfo.path.lastIndexOf("/")
                            )
                            if (
                                !folderPath.length &&
                                editor.app.routes[""].app === "document"
                            ) {
                                editor.app.goTo("/")
                            } else {
                                editor.app.goTo(`/documents${folderPath}/`)
                            }
                        } else {
                            if (
                                editor.app.settings?.REGISTRATION_OPEN ||
                                editor.app.settings?.SOCIALACCOUNT_OPEN
                            ) {
                                window.location.href = "/account/sign-up/"
                            } else {
                                window.location.href = "/"
                            }
                        }
                        return
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                },
                {
                    title: gettext("Save revision"),
                    type: "action",
                    //icon: 'save',
                    tooltip: gettext("Save a revision of the document."),
                    order: 2,
                    keys: "Ctrl-s",
                    action: (editor: Editor) => {
                        const dialog = new RevisionDialog(editor.docInfo.dir)
                        dialog.init().then(note => {
                            const db = getDB(editor)
                            const saver = new SaveRevision(
                                getExportDoc(editor),
                                db.imageDB,
                                db.bibDB,
                                note,
                                editor.app
                            )
                            return saver.init()
                        })
                    },
                    disabled: (editor: Editor) =>
                        editor.docInfo.access_rights !== "write" ||
                        editor.app.isOffline() ||
                        !!editor.docInfo.token,
                    available: (editor: Editor) =>
                        editor.app.settings.EDITOR_SAVE_MODE !== "external"
                },
                {
                    title: gettext("Create copy"),
                    type: "action",
                    //icon: 'copy',
                    tooltip: gettext("Create a copy of the document."),
                    order: 3,
                    action: (editor: Editor) => {
                        const db = getDB(editor)
                        const copier = new SaveCopy(
                            getExportDoc(editor),
                            db.bibDB,
                            db.imageDB,
                            editor.user,
                            null,
                            null,
                            editor.app.apiConnectors.documentImport
                        )
                        copier
                            .init()
                            .then(({docInfo}) =>
                                editor.app.goTo(`/document/${docInfo.id}/`)
                            )
                            .catch(() => false)
                    },
                    disabled: (editor: Editor) =>
                        editor.app.isOffline() ||
                        (!!editor.docInfo.token &&
                            !editor.user.is_authenticated),
                    available: (editor: Editor) =>
                        editor.app.settings.EDITOR_SAVE_MODE !== "external"
                },
                {
                    title: gettext("Download"),
                    type: "action",
                    //icon: 'download',
                    tooltip: gettext(
                        "Export the document as a FIDUS file including its template."
                    ),
                    order: 4,
                    action: (editor: Editor) => {
                        const db = getDB(editor)
                        new ExportFidusFile(
                            editor.app,
                            getExportDoc(editor),
                            db.bibDB,
                            db.imageDB,
                            true,
                            editor.docInfo.token
                        )
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                },
                {
                    title: gettext("Print"),
                    type: "action",
                    //icon: 'print',
                    tooltip: gettext(
                        "Print the document using your browser print dialog."
                    ),
                    order: 5,
                    keys: "Ctrl-p",
                    action: (editor: Editor) => {
                        import(
                            "@fiduswriter/document/exporter/print/index"
                        ).then(({PrintExporter}) => {
                            const db = getDB(editor)
                            const doc = getExportDoc(editor, {
                                changes: "acceptAllNoInsertions"
                            })
                            const exporter = new PrintExporter(
                                doc,
                                db.bibDB,
                                db.imageDB,
                                editor.app.csl,
                                editor.docInfo.updated as Date as Date,
                                getDocumentTemplate(editor).documentStyles,
                                exportProgress(doc)
                            )
                            exporter.init()
                        })
                    }
                },
                {
                    title: gettext("Change password"),
                    type: "action",
                    tooltip: gettext(
                        "Change the password of this encrypted document."
                    ),
                    order: 6,
                    available: (editor: Editor) => editor.docInfo.e2ee,
                    action: async (editor: Editor) => {
                        if (!editor.e2ee || !editor.e2ee.key) {
                            addAlert(
                                "error",
                                gettext(
                                    "Document key is not available. Please reload the document."
                                )
                            )
                            return
                        }
                        const e2ee = editor.e2ee
                        const isPassphraseUser =
                            e2ee.usesPassphrase &&
                            PassphraseManager.hasKeysInSession()
                        const suggestedNewPassword = isPassphraseUser
                            ? await PassphraseManager.generateDocumentPassword()
                            : ""

                        let changeOptions
                        if (isPassphraseUser) {
                            // Passphrase users: current password is known, new password
                            // is auto-generated and shown in plaintext for sharing.
                            changeOptions = {
                                currentPassword:
                                    e2ee.password ||
                                    E2EEKeyManager.getPasswordFromSession(
                                        editor.docInfo.id as number
                                    ) ||
                                    "",
                                suggestedNewPassword,
                                hideCurrentPassword: true,
                                showNewPasswordPlaintext: true,
                                infoText: gettext(
                                    "Your personal passphrase will still unlock this document. A new random password is generated automatically. Other passphrase users will receive it automatically; non-passphrase collaborators need it shared with them manually."
                                )
                            }
                        } else {
                            // Non-passphrase users: prefill current password from
                            // sessionStorage if available, but keep it visible for
                            // verification.
                            const sessionPassword =
                                E2EEKeyManager.getPasswordFromSession(
                                    editor.docInfo.id as number
                                )
                            changeOptions = {
                                currentPassword: sessionPassword || "",
                                suggestedNewPassword: ""
                            }
                        }

                        changePasswordDialog(
                            async ({
                                currentPassword,
                                newPassword
                            }: {
                                currentPassword: string
                                newPassword: string
                            }) => {
                                try {
                                    // Verify the current password.
                                    // If the entered password matches what is already cached
                                    // in memory or sessionStorage, the document is already
                                    // open with that key — skip the expensive PBKDF2
                                    // re-derivation used only to prove correctness.
                                    const cachedPassword =
                                        e2ee.password ||
                                        E2EEKeyManager.getPasswordFromSession(
                                            editor.docInfo.id as number
                                        )
                                    if (
                                        !cachedPassword ||
                                        currentPassword !== cachedPassword
                                    ) {
                                        const currentSaltBytes = new Uint8Array(
                                            atob(e2ee.encryptionSalt as string)
                                                .split("")
                                                .map(c => c.charCodeAt(0))
                                        )
                                        const currentKey =
                                            await E2EEKeyManager.resolvePasswordToKey(
                                                currentPassword,
                                                currentSaltBytes,
                                                e2ee.encryptionIterations as number
                                            )
                                        const {E2EEEncryptor} = await import(
                                            "fwtoolkit/e2ee/encryptor"
                                        )
                                        const testValue = "test"
                                        const encryptedTest =
                                            await E2EEEncryptor.encrypt(
                                                testValue,
                                                currentKey
                                            )
                                        await E2EEEncryptor.decrypt(
                                            encryptedTest,
                                            e2ee.key as CryptoKey
                                        )
                                    }

                                    // Current password verified — generate new salt and key
                                    const newSalt =
                                        E2EEKeyManager.generateSalt()
                                    const newSaltBase64 = btoa(
                                        String.fromCharCode(...newSalt)
                                    )
                                    const newIterations = 600000
                                    const newKey =
                                        await E2EEKeyManager.resolvePasswordToKey(
                                            newPassword,
                                            newSalt,
                                            newIterations
                                        )

                                    // Re-encrypt the document with the new key
                                    await e2ee.snapshotManager!
                                        .reEncryptWithNewKey(
                                        newKey,
                                        newSaltBase64,
                                        newIterations
                                    )

                                    // Update local E2EE state
                                    e2ee.encryptionSalt = newSaltBase64
                                    e2ee.encryptionIterations = newIterations
                                    e2ee.key = newKey
                                    e2ee.password = newPassword

                                    // Cache password and key in sessionStorage
                                    E2EEKeyManager.storePasswordInSession(
                                        editor.docInfo.id as number,
                                        newPassword
                                    )
                                    await E2EEKeyManager.storeKeyInSession(
                                        editor.docInfo.id as number,
                                        newKey
                                    )

                                    // If passphrase user, update encrypted password on server
                                    if (isPassphraseUser) {
                                        try {
                                            await PassphraseManager.saveDocumentPassword(
                                                editor.docInfo.id as number,
                                                newPassword,
                                                undefined,
                                                "user",
                                                true
                                            )
                                        } catch (_e) {
                                            console.error(
                                                "Failed to update document password on server:",
                                                _e
                                            )
                                        }
                                    }

                                    if (isPassphraseUser) {
                                        addAlert(
                                            "success",
                                            gettext(
                                                "Document encryption key rotated. Other passphrase users will receive the new key automatically."
                                            )
                                        )
                                    } else {
                                        addAlert(
                                            "success",
                                            gettext(
                                                "Document password changed. Remember to share the new password with your collaborators."
                                            )
                                        )
                                    }
                                } catch (_error) {
                                    addAlert(
                                        "error",
                                        gettext(
                                            "The current password is incorrect."
                                        )
                                    )
                                }
                            },
                            changeOptions
                        )
                    },
                    disabled: (editor: Editor) =>
                        !editor.e2ee?.encrypted ||
                        editor.docInfo.access_rights !== "write"
                }
            ]
        },
        {
            id: "export",
            title: gettext("Export"),
            tooltip: gettext("Export of the document contents"),
            type: "menu",
            order: 1,
            keys: "Alt-e",
            content: [
                {
                    title: gettext("HTML"),
                    type: "action",
                    tooltip: gettext("Export the document to an HTML file."),
                    order: 0,
                    action: (editor: Editor) => {
                        import(
                            "@fiduswriter/document/exporter/html/index"
                        ).then(async ({HTMLExporter}) => {
                            const db = getDB(editor)
                            const dialog = new HtmlExportDialog()
                            const options = await dialog.init()
                            if (!options) {
                                return
                            }
                            const doc = getExportDoc(
                                editor,
                                options.resolveTrackChanges
                                    ? {changes: "acceptAllNoInsertions"}
                                    : undefined
                            )
                            const converterOptions: Record<string, unknown> = {}
                            if (options.svgMath) {
                                converterOptions.mathOutput = "svg"
                            }
                            if (!options.resolveTrackChanges) {
                                // Keep the marks and render them in the output.
                                converterOptions.trackChanges = true
                            }
                            const exporter = new HTMLExporter(
                                doc,
                                db.bibDB,
                                db.imageDB,
                                editor.app.csl,
                                editor.docInfo.updated as Date,
                                getDocumentTemplate(editor).documentStyles,
                                converterOptions
                            )
                            exporter.progressCallback = exportProgress(doc)
                            exporter.init()
                        })
                    }
                },
                {
                    title: gettext("PDF"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document directly to a PDF file."
                    ),
                    order: 1,
                    action: (editor: Editor) => {
                        import(
                            "@fiduswriter/document/exporter/pdf/index"
                        ).then(async ({PdfExporter}) => {
                            const db = getDB(editor)
                            const dialog = new PdfExportDialog()
                            const options = await dialog.init()
                            if (!options) {
                                return
                            }
                            const doc = getExportDoc(
                                editor,
                                options.resolveTrackChanges
                                    ? {changes: "acceptAllNoInsertions"}
                                    : undefined
                            )
                            let fidusFile: Uint8Array | undefined
                            if (options.embedFidusFile) {
                                // The ExportFidusFile constructor runs init()
                                // itself and returns the resulting Promise,
                                // so `new ExportFidusFile(...)` is awaited
                                // directly to obtain the .fidus Blob.
                                const blob = (await new ExportFidusFile(
                                    editor.app,
                                    doc,
                                    db.bibDB,
                                    db.imageDB,
                                    true,
                                    editor.docInfo.token,
                                    false
                                )) as unknown as Blob
                                fidusFile = new Uint8Array(
                                    await blob.arrayBuffer()
                                )
                            }
                            const pdfExporter = new PdfExporter(
                                doc,
                                db.bibDB,
                                db.imageDB,
                                editor.app.csl,
                                editor.docInfo.updated as Date,
                                getDocumentTemplate(editor).documentStyles,
                                exportProgress(doc),
                                {
                                    version: editor.app.settings
                                        .VERSION as string | undefined,
                                    userName:
                                        editor.user?.name ||
                                        editor.user?.username ||
                                        undefined,
                                    fidusFile,
                                    figurePageFloats:
                                        options.figurePageFloats,
                                    tablePageFloats: options.tablePageFloats,
                                    printOptions: options.printOptions
                                }
                            )
                            pdfExporter.init()
                        })
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                },
                {
                    title: gettext("Epub"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to an Epub electronic reader file."
                    ),
                    order: 1,
                    action: (editor: Editor) => {
                        import(
                            "@fiduswriter/document/exporter/epub/index"
                        ).then(async ({EpubExporter}) => {
                            const db = getDB(editor)
                            const dialog = new EpubExportDialog()
                            const options = await dialog.init()
                            if (!options) {
                                return
                            }
                            const doc = getExportDoc(
                                editor,
                                options.resolveTrackChanges
                                    ? {changes: "acceptAllNoInsertions"}
                                    : undefined
                            )
                            const converterOptions: Record<string, unknown> = {}
                            if (options.svgMath) {
                                converterOptions.mathOutput = "svg"
                            }
                            if (!options.resolveTrackChanges) {
                                // Keep the marks and render them in the output.
                                converterOptions.trackChanges = true
                            }
                            const exporter = new EpubExporter(
                                doc,
                                db.bibDB,
                                db.imageDB,
                                editor.app.csl,
                                editor.docInfo.updated as Date,
                                getDocumentTemplate(editor).documentStyles,
                                converterOptions
                            )
                            exporter.progressCallback = exportProgress(doc)
                            exporter.init()
                        })
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                },
                {
                    title: gettext("LaTeX"),
                    type: "action",
                    tooltip: gettext("Export the document to an LaTeX file."),
                    order: 2,
                    action: (editor: Editor) => {
                        import(
                            "@fiduswriter/document/exporter/latex/index"
                        ).then(({LatexExporter}) => {
                            const db = getDB(editor)
                            const doc = getExportDoc(editor, {
                                changes: "acceptAllNoInsertions"
                            })
                            const exporter = new LatexExporter(
                                doc,
                                db.bibDB,
                                db.imageDB,
                                editor.docInfo.updated as Date
                            )
                            exporter.progressCallback = exportProgress(doc)
                            exporter.init()
                        })
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                },
                {
                    title: gettext("JATS"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to a Journal Archiving and Interchange Tag Library NISO JATS Version 1.2 file."
                    ),
                    order: 2,
                    action: (editor: Editor) => {
                        import(
                            "@fiduswriter/document/exporter/jats/index"
                        ).then(({JATSExporter}) => {
                            const db = getDB(editor)
                            const doc = getExportDoc(editor, {
                                changes: "acceptAllNoInsertions"
                            })
                            const exporter = new JATSExporter(
                                doc,
                                db.bibDB,
                                db.imageDB,
                                editor.app.csl,
                                editor.docInfo.updated as Date,
                                "article"
                            )
                            exporter.progressCallback = exportProgress(doc)
                            exporter.init()
                        })
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                },
                {
                    title: gettext("BITS"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to a Book Interchange Tag Set BITS Version 2.1 file."
                    ),
                    order: 2,
                    action: (editor: Editor) => {
                        import(
                            "@fiduswriter/document/exporter/jats/index"
                        ).then(({JATSExporter}) => {
                            const db = getDB(editor)
                            const doc = getExportDoc(editor, {
                                changes: "acceptAllNoInsertions"
                            })
                            const exporter = new JATSExporter(
                                doc,
                                db.bibDB,
                                db.imageDB,
                                editor.app.csl,
                                editor.docInfo.updated as Date,
                                "book-part-wrapper"
                            )
                            exporter.progressCallback = exportProgress(doc)
                            exporter.init()
                        })
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                },
                {
                    title: gettext("Pandoc JSON"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to a Pandoc JSON file."
                    ),
                    order: 3,
                    action: (editor: Editor) => {
                        import(
                            "@fiduswriter/document/exporter/pandoc/index"
                        ).then(({PandocExporter}) => {
                            const db = getDB(editor)
                            const doc = getExportDoc(editor, {
                                changes: "acceptAllNoInsertions"
                            })
                            const exporter = new PandocExporter(
                                doc,
                                db.bibDB,
                                db.imageDB,
                                editor.app.csl,
                                editor.docInfo.updated as Date
                            )
                            exporter.progressCallback = exportProgress(doc)
                            exporter.init()
                        })
                    },
                    disabled: (editor: Editor) => editor.app.isOffline()
                },
                {
                    title: gettext("Slim FIDUS"),
                    type: "action",
                    tooltip: gettext(
                        "Export the document to a FIDUS file without its template."
                    ),
                    order: 4,
                    action: (editor: Editor) => {
                        const db = getDB(editor)
                        new ExportFidusFile(
                            editor.app,
                            getExportDoc(editor),
                            db.bibDB,
                            db.imageDB,
                            false
                        )
                    }
                }
            ]
        },
        {
            id: "settings",
            title: gettext("Settings"),
            tooltip: gettext("Configure settings of this document."),
            type: "menu",
            order: 2,
            keys: "Alt-s",
            content: [
                {
                    id: "citation_style",
                    title: gettext("Citation Style"),
                    type: "menu",
                    tooltip: gettext("Choose your preferred citation style."),
                    order: 1,
                    disabled: (editor: Editor) => {
                        return editor.docInfo.access_rights !== "write"
                    },
                    content: []
                },
                {
                    id: "document_style",
                    title: gettext("Document Style"),
                    type: "menu",
                    tooltip: gettext("Choose your preferred document style."),
                    order: 2,
                    disabled: (editor: Editor) => {
                        return (
                            editor.docInfo.access_rights !== "write" ||
                            editor.app.isOffline()
                        )
                    },
                    content: []
                },
                {
                    id: "language",
                    title: gettext("Text Language"),
                    type: "menu",
                    tooltip: gettext("Choose the language of the document."),
                    order: 3,
                    disabled: (editor: Editor) => {
                        return editor.docInfo.access_rights !== "write"
                    },
                    content: [
                        languageItem(
                            "en-US",
                            gettext("English (United States)"),
                            0
                        ),
                        languageItem(
                            "en-GB",
                            gettext("English (United Kingdom)"),
                            1
                        ),
                        languageItem("de-DE", gettext("German (Germany)"), 2),
                        languageItem(
                            "zh-CN",
                            gettext("Chinese (Simplified)"),
                            3
                        ),
                        languageItem("es", gettext("Spanish"), 4),
                        languageItem("fr", gettext("French"), 5),
                        languageItem("ja", gettext("Japanese"), 6),
                        languageItem("it", gettext("Italian"), 7),
                        //languageItem('pl', gettext('Polish'), 8),
                        languageItem(
                            "pt-BR",
                            gettext("Portuguese (Brazil)"),
                            9
                        ),
                        //languageItem('nl', gettext('Dutch'), 10),
                        //languageItem('ru', gettext('Russian'), 11),
                        {
                            type: "separator",
                            order: 12,
                            available: (editor: Editor) => {
                                // There has to be at least one language of the default languages
                                // among the default ones and one that is not among the default ones.
                                return (
                                    !!editor.view.state.doc.attrs.languages.find(
                                        (lang: string) =>
                                            [
                                                "en-US",
                                                "en-GB",
                                                "de-DE",
                                                "zh-CN",
                                                "es",
                                                "fr",
                                                "ja",
                                                "it",
                                                "pl",
                                                "pt-BR",
                                                "nl",
                                                "ru"
                                            ].includes(lang)
                                    ) &&
                                    !!editor.view.state.doc.attrs.languages.find(
                                        (lang: string) =>
                                            ![
                                                "en-US",
                                                "en-GB",
                                                "de-DE",
                                                "zh-CN",
                                                "es",
                                                "fr",
                                                "ja",
                                                "it",
                                                "pl",
                                                "pt-BR",
                                                "nl",
                                                "ru"
                                            ].includes(lang)
                                    )
                                )
                            }
                        },
                        {
                            title: gettext("Other"),
                            type: "setting",
                            order: 13,
                            action: (editor: Editor) => {
                                const language =
                                        editor.view.state.doc.attrs.language,
                                    dialog = new LanguageDialog(
                                        editor,
                                        language
                                    )
                                dialog.init()
                            },
                            selected: (editor: Editor) => {
                                return ![
                                    "en-US",
                                    "en-GB",
                                    "de-DE",
                                    "zh-CN",
                                    "es",
                                    "fr",
                                    "ja",
                                    "it",
                                    "pl",
                                    "pt-BR",
                                    "nl",
                                    "ru"
                                ].includes(editor.view.state.doc.attrs.language)
                            },
                            available: (editor: Editor) =>
                                !!editor.view.state.doc.attrs.languages.find(
                                    (lang: string) =>
                                        ![
                                            "en-US",
                                            "en-GB",
                                            "de-DE",
                                            "zh-CN",
                                            "es",
                                            "fr",
                                            "ja",
                                            "it",
                                            "pl",
                                            "pt-BR",
                                            "nl",
                                            "ru"
                                        ].includes(lang)
                                )
                        }
                    ]
                },
                {
                    id: "paper_size",
                    title: gettext("Paper Size"),
                    type: "menu",
                    tooltip: gettext(
                        "Choose a papersize for print and PDF generation."
                    ),
                    order: 4,
                    disabled: (editor: Editor) => {
                        return editor.docInfo.access_rights !== "write"
                    },
                    content: [
                        {
                            title: gettext("DIN A4"),
                            type: "setting",
                            tooltip: gettext(
                                "A4 (DIN A4/ISO 216) which is used in most of the world."
                            ),
                            order: 0,
                            action: (editor: Editor) => {
                                editor.view.dispatch(
                                    editor.view.state.tr
                                        .setDocAttribute("papersize", "A4")
                                        .setMeta("settings", true)
                                )
                            },
                            selected: (editor: Editor) => {
                                return (
                                    editor.view.state.doc.attrs.papersize ===
                                    "A4"
                                )
                            },
                            available: (editor: Editor) => {
                                return editor.view.state.doc.attrs.papersizes.includes(
                                    "A4"
                                )
                            }
                        },
                        {
                            title: gettext("US Letter"),
                            type: "setting",
                            tooltip: gettext(
                                "The format used by the USA and some other American countries."
                            ),
                            order: 1,
                            action: (editor: Editor) => {
                                editor.view.dispatch(
                                    editor.view.state.tr
                                        .setDocAttribute(
                                            "papersize",
                                            "US Letter"
                                        )
                                        .setMeta("settings", true)
                                )
                            },
                            selected: (editor: Editor) => {
                                return (
                                    editor.view.state.doc.attrs.papersize ===
                                    "US Letter"
                                )
                            },
                            available: (editor: Editor) => {
                                return editor.view.state.doc.attrs.papersizes.includes(
                                    "US Letter"
                                )
                            }
                        }
                    ]
                },
                {
                    title: gettext("Copyright Information"),
                    type: "setting",
                    order: 5,
                    action: (editor: Editor) => {
                        const dialog = new CopyrightDialog(
                            editor.view.state.doc.attrs.copyright
                        )
                        dialog.init().then(copyright => {
                            if (copyright) {
                                editor.view.dispatch(
                                    editor.view.state.tr
                                        .setDocAttribute("copyright", copyright)
                                        .setMeta("settings", true)
                                )
                            }
                            editor.currentView.focus()
                        })
                    },
                    disabled: (editor: Editor) => editor.docInfo.access_rights !== "write"
                }
            ]
        },
        {
            id: "tools",
            title: gettext("Tools"),
            tooltip: gettext("Select document editing tool."),
            type: "menu",
            order: 3,
            keys: "Alt-t",
            content: [
                {
                    title: gettext("Word counter"),
                    type: "action",
                    tooltip: gettext("See document statistics."),
                    order: 0,
                    action: (editor: Editor) => {
                        const dialog = new WordCountDialog(editor)
                        dialog.init()
                    }
                },
                {
                    title: gettext("Search and replace"),
                    type: "action",
                    tooltip: gettext("Show a search and replace dialog."),
                    order: 1,
                    keys: "Ctrl-h",
                    action: (editor: Editor) => {
                        const dialog = new SearchReplaceDialog(editor)
                        dialog.init()
                    }
                },
                {
                    title: gettext("Keyboard shortcuts"),
                    type: "action",
                    tooltip: gettext(
                        "Show an overview of available keyboard shortcuts."
                    ),
                    order: 2,
                    keys: "Shift-Ctrl-/",
                    action: (editor: Editor) => {
                        const dialog = new KeyBindingsDialog(editor)
                        dialog.init()
                    }
                }
            ]
        },
        {
            title: gettext("Track changes"),
            type: "menu",
            tooltip: gettext("Tracking changes to the document"),
            order: 4,
            keys: "Alt-c",
            disabled: (editor: Editor) => editor.docInfo.access_rights !== "write",
            content: [
                {
                    title: gettext("Record"),
                    type: "setting",
                    tooltip: gettext("Record document changes"),
                    order: 0,
                    disabled: (editor: Editor) => {
                        return editor.docInfo.access_rights !== "write"
                    },
                    action: (editor: Editor) => {
                        const tracked = !editor.view.state.doc.attrs.tracked
                        editor.view.dispatch(
                            editor.view.state.tr
                                .setDocAttribute("tracked", tracked)
                                .setMeta("settings", true)
                        )
                    },
                    selected: (editor: Editor) => {
                        return editor.view.state.doc.attrs.tracked === true
                    }
                },
                {
                    title: gettext("Accept all"),
                    type: "action",
                    tooltip: gettext("Accept all tracked changes."),
                    order: 1,
                    action: (editor: Editor) => {
                        getTrack(editor).acceptAll()
                    }
                },
                {
                    title: gettext("Reject all"),
                    type: "action",
                    tooltip: gettext("Reject all tracked changes."),
                    order: 2,
                    action: (editor: Editor) => {
                        getTrack(editor).rejectAll()
                    }
                }
            ]
        }
    ]
})
