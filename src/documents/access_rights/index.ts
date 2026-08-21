import {
    ContentMenu,
    Dialog,
    DialogTabs,
    addAlert,
    enableDatePicker,
    ensureCSS,
    findTarget,
    setCheckableLabel
} from "fwtoolkit"
import type {ContentMenuInit} from "fwtoolkit/content_menu"

import {AddContactDialog} from "../../contacts/add_dialog.js"
import type {EditorContactsApi, EditorDocumentApi} from "../../types.js"
import {
    collaboratorsTemplate,
    contactsTemplate,
    createShareTokenDialogTemplate,
    peopleTabTemplate,
    shareLinkTabTemplate,
    shareTokenListTemplate,
    shareTokenRowTemplate
} from "./templates.js"

ensureCSS(staticUrl("css/fwtoolkit/checkable_list.css"))

interface Contact {
    id: number | string
    type: string
    name: string
    avatar?: string
}

interface AccessRightHolder {
    id: number
    type: string
}

interface AccessRight {
    document_id?: number
    holder: AccessRightHolder
    rights: string
}

interface Collaborator {
    holder: Contact
    rights: string
    count: number
}

interface ShareToken {
    id: number
    share_url: string
    expires_at?: string
    note?: string
    rights: string
}

interface AccessRightsTabOptions {
    documentIds: number[]
    contacts: Contact[]
    newContactCall: (contactData: Contact) => void
    e2ee: boolean
    documentPassword?: string
    onShareSuccess?: (accessRights: AccessRight[]) => void
    settings: Record<string, unknown>
    container?: HTMLElement | null
    documentApi: EditorDocumentApi
    contactsApi: EditorContactsApi
    isOwner?: boolean
}

interface AccessRightMenuItem {
    type?: "header" | "action" | "separator"
    title: string
    tooltip?: string
    icon?: string
    right?: string
    action?: () => void
    selected?: boolean
}

/**
 * Build the collaborators list from raw access rights and document IDs.
 */
function getCollaborators(
    accessRights: AccessRight[],
    documentIds: number[]
): Collaborator[] {
    const docCollabs: Record<string, Collaborator> = {}
    accessRights.forEach(ar => {
        if (!ar.document_id || !documentIds.includes(ar.document_id)) {
            return
        }
        const holderIdent = ar.holder.type + ar.holder.id
        if (docCollabs[holderIdent]) {
            if (docCollabs[holderIdent].rights != ar.rights) {
                docCollabs[holderIdent].rights = "read"
            }
            docCollabs[holderIdent].count += 1
        } else {
            docCollabs[holderIdent] = Object.assign({}, ar, {
                holder: {id: ar.holder.id, type: ar.holder.type},
                count: 1
            }) as unknown as Collaborator
        }
    })
    return Object.values(docCollabs).filter(
        col => col.count === documentIds.length
    )
}

/**
 * Collect access rights from the DOM inside a given container.
 */
function collectAccessRights(container: HTMLElement): AccessRight[] {
    const accessRights: AccessRight[] = []
    container
        .querySelectorAll("#share-contact .fw-collaborator-tr")
        .forEach(el => {
            const htmlEl = el as HTMLElement
            accessRights.push({
                holder: {
                    id: Number.parseInt(htmlEl.dataset.id || "0"),
                    type: htmlEl.dataset.type || ""
                },
                rights: htmlEl.dataset.rights || ""
            })
        })
    return accessRights
}

/**
 * Reusable access-rights tab / panel.
 *
 * Can be embedded inside another dialog (e.g. the Document Settings dialog)
 * or wrapped in its own Dialog via DocumentAccessRightsDialog.
 */
export class AccessRightsTab {
    documentIds: number[]
    contacts: Contact[]
    newContactCall: (contactData: Contact) => void
    singleDocumentId: number | null
    e2ee: boolean
    documentPassword: string
    onShareSuccess?: (accessRights: AccessRight[]) => void
    settings: Record<string, unknown>
    container: HTMLElement | null
    accessRights: AccessRight[]
    dialogTabs!: DialogTabs
    documentApi: EditorDocumentApi
    contactsApi: EditorContactsApi
    isOwner: boolean

    constructor({
        documentIds,
        contacts,
        newContactCall,
        e2ee,
        documentPassword = "",
        onShareSuccess,
        settings,
        container = null,
        documentApi,
        contactsApi,
        isOwner = false
    }: AccessRightsTabOptions) {
        this.documentIds = documentIds
        this.contacts = contacts
        this.newContactCall = newContactCall
        this.singleDocumentId =
            documentIds.length === 1 ? documentIds[0] : null
        this.e2ee = e2ee
        this.documentPassword = documentPassword
        this.onShareSuccess = onShareSuccess
        this.settings = settings
        this.container = container || null
        this.isOwner = isOwner
        this.accessRights = []
        this.documentApi = documentApi
        this.contactsApi = contactsApi
    }

    load(): Promise<void> {
        return this.documentApi
            .getAccessRights({
                document_ids: this.documentIds
            })
            .catch(error => {
                addAlert("error", gettext("Cannot load document access data."))
                throw error
            })
            .then(({json}: {json: unknown}) => {
                const data = json as {access_rights: AccessRight[]}
                this.accessRights = data.access_rights
            })
    }

    render(): string {
        const collaborators = getCollaborators(
            this.accessRights,
            this.documentIds
        )

        const e2eeWarningBanner = this.e2ee
            ? `<div class="e2ee-access-rights-warning">
                <strong><i class="fa-solid fa-lock"></i> ${gettext("End-to-end encrypted document")}</strong>
                <p>${gettext("This document is end-to-end encrypted. Collaborators without a personal passphrase will need the document password shared with them through a secure channel outside of Fidus Writer. Do not send the password through the document chat.")}</p>
            </div>`
            : ""

        const tabs = [
            {
                id: "people",
                title: gettext("People"),
                template: () =>
                    peopleTabTemplate({
                        contacts: this.contacts,
                        collaborators
                    })
            }
        ]
        if (this.isOwner) {
            tabs.push({
                id: "sharelink",
                title: gettext("Share link"),
                template: () => shareLinkTabTemplate()
            })
        }

        this.dialogTabs = new DialogTabs(tabs, {
            onShow: index => {
                if (
                    this.isOwner &&
                    index === 1 &&
                    this.singleDocumentId
                ) {
                    this.loadShareTokens()
                }
            }
        })

        const html = e2eeWarningBanner + this.dialogTabs.render()

        if (this.container) {
            this.container.innerHTML = html
        }
        return html
    }

    bindEvents(): void {
        const container = this.container
        if (!container) {
            return
        }

        // Add selected contacts to collaborators
        container
            .querySelector("#add-share-contact")
            ?.addEventListener("click", () => {
                const selectedData: Collaborator[] = []
                container
                    .querySelectorAll("#my-contacts .fw-checkable.fw-checked")
                    .forEach(el => {
                        const htmlEl = el as HTMLElement
                        const collaboratorEl = container.querySelector(
                            `#collaborator-${htmlEl.dataset.type}-${htmlEl.dataset.id}`
                        )
                        if (collaboratorEl) {
                            const colRow = collaboratorEl as HTMLElement
                            if (colRow.dataset.rights === "delete") {
                                colRow.dataset.rights = "read"
                                const accessRightIcon =
                                    colRow.querySelector(".fw-icon-access-right")
                                accessRightIcon?.classList.remove(
                                    "icon-access-delete"
                                )
                                accessRightIcon?.classList.add(
                                    "icon-access-read"
                                )
                            }
                        } else {
                            const collaborator = this.contacts.find(
                                contact =>
                                    contact.type === htmlEl.dataset.type &&
                                    contact.id ===
                                        Number.parseInt(htmlEl.dataset.id || "0")
                            )
                            if (!collaborator) {
                                console.warn(
                                    `No contact found of type: ${htmlEl.dataset.type} id: ${htmlEl.dataset.id}.`
                                )
                                return
                            }
                            selectedData.push({
                                holder: {
                                    id: collaborator.id,
                                    type: collaborator.type,
                                    name: collaborator.name,
                                    avatar: collaborator.avatar
                                },
                                rights: "read",
                                count: 1
                            })
                        }
                    })

                container
                    .querySelectorAll(
                        "#my-contacts .checkable-label.fw-checked"
                    )
                    .forEach(el => el.classList.remove("fw-checked"))
                container
                    .querySelector("#share-contact table tbody")
                    ?.insertAdjacentHTML(
                        "beforeend",
                        collaboratorsTemplate({
                            collaborators: selectedData
                        })
                    )
            })

        // Inner tab switching (People / Share link)
        this.dialogTabs.bind(container)

        // Share-link actions
        container.addEventListener("click", event => {
            const el: {target?: Element | null} = {}
            if (findTarget(event, "#create-share-token-btn", el)) {
                this.openCreateShareTokenDialog()
                return
            }
            if (findTarget(event, ".copy-share-token-btn", el)) {
                const url = (
                    (el.target as HTMLElement).closest(
                        ".copy-share-token-btn"
                    ) as HTMLElement | null
                )?.dataset.url
                if (url) {
                    navigator.clipboard.writeText(url).then(
                        () =>
                            addAlert(
                                "success",
                                gettext("Link copied to clipboard.")
                            ),
                        () => addAlert("error", gettext("Could not copy link."))
                    )
                }
                return
            }
            if (findTarget(event, ".revoke-share-token-btn", el)) {
                const btn = (el.target as HTMLElement).closest(
                    ".revoke-share-token-btn"
                ) as HTMLElement
                const tokenId = Number.parseInt(btn.dataset.tokenId || "0")
                const rowEl = btn.closest(".share-token-row")
                if (rowEl) {
                    this.revokeShareToken(tokenId, rowEl as HTMLElement)
                }
                return
            }
        })

        // Collaborator actions
        container.addEventListener("click", event => {
            const el: {target?: Element | null} = {}
            switch (true) {
                case findTarget(event, ".fw-checkable", el):
                    setCheckableLabel(el.target as HTMLElement)
                    break
                case findTarget(event, ".delete-collaborator", el): {
                    const colRow = (el.target as HTMLElement).closest(
                        ".fw-collaborator-tr"
                    ) as HTMLElement
                    colRow.dataset.rights = "delete"
                    const icon = colRow.querySelector(".fw-icon-access-right")
                    icon?.setAttribute(
                        "class",
                        "fw-icon-access-right icon-access-delete"
                    )
                    break
                }
                case findTarget(event, ".edit-right", el): {
                    const colRow = (el.target as HTMLElement).closest(
                        ".fw-collaborator-tr"
                    ) as HTMLElement
                    const currentRight = colRow.dataset.rights || ""
                    const menu = this.getDropdownMenu(
                        currentRight,
                        newRight => {
                            colRow.dataset.rights = newRight
                            const icon = colRow.querySelector(
                                ".fw-icon-access-right"
                            )
                            icon?.setAttribute(
                                "class",
                                `icon-access-right icon-access-${newRight}`
                            )
                        }
                    )
                    const contentMenu = new ContentMenu({
                        menu: menu as ContentMenuInit,
                        menuPos: {X: (event as MouseEvent).pageX, Y: (event as MouseEvent).pageY},
                        width: 200
                    })
                    contentMenu.open()
                    break
                }
                default:
                    break
            }
        })
    }

    getDropdownMenu(
        currentRight: string,
        onChange: (newRight: string) => void
    ): {content: AccessRightMenuItem[]} {
        const E2EE_ALLOWED_RIGHTS = ["write", "read-without-comments", "read"]

        const allItems: AccessRightMenuItem[] = [
            {
                type: "header",
                title: gettext("Basic"),
                tooltip: gettext("Basic access rights")
            },
            {
                type: "action",
                title: gettext("Write"),
                icon: "pencil-alt",
                tooltip: gettext("Write"),
                right: "write",
                action: () => onChange("write"),
                selected: currentRight === "write"
            },
            {
                type: "action",
                title: gettext("Write tracked"),
                icon: "pencil-alt",
                tooltip: gettext("Write with changes tracked"),
                right: "write-tracked",
                action: () => onChange("write-tracked"),
                selected: currentRight === "write-tracked"
            },
            {
                type: "action",
                title: gettext("Comment"),
                icon: "comment",
                tooltip: gettext("Comment"),
                right: "comment",
                action: () => onChange("comment"),
                selected: currentRight === "comment"
            },
            {
                type: "action",
                title: gettext("Read"),
                icon: "eye",
                tooltip: gettext("Read"),
                right: "read",
                action: () => onChange("read"),
                selected: currentRight === "read"
            },
            {
                type: "header",
                title: gettext("Review"),
                tooltip: gettext("Access rights used within document review")
            },
            {
                type: "action",
                title: gettext("No comments"),
                icon: "eye",
                tooltip: gettext(
                    "Read document but not see comments and chats of others"
                ),
                right: "read-without-comments",
                action: () => onChange("read-without-comments"),
                selected: currentRight === "read-without-comments"
            },
            {
                type: "action",
                title: gettext("Review"),
                icon: "comment",
                tooltip: gettext(
                    "Comment, but not see comments and chats of others"
                ),
                right: "review",
                action: () => onChange("review"),
                selected: currentRight === "review"
            },
            {
                type: "action",
                title: gettext("Review tracked"),
                icon: "pencil-alt",
                tooltip: gettext(
                    "Write with tracked changes, but not see comments and chats of others"
                ),
                right: "review-tracked",
                action: () => onChange("review-tracked"),
                selected: currentRight === "review-tracked"
            }
        ]

        const content = this.e2ee
            ? allItems.filter(item => {
                  if (item.type === "header") {
                      return true
                  }
                  return item.right && E2EE_ALLOWED_RIGHTS.includes(item.right)
              })
            : allItems

        const filteredContent = content.filter((item, index) => {
            if (item.type === "header") {
                const nextItems = content.slice(index + 1)
                const nextAction = nextItems.find(i => i.type === "action")
                const nextHeader = nextItems.findIndex(
                    i => i.type === "header"
                )
                if (!nextAction) {
                    return false
                }
                if (
                    nextHeader >= 0 &&
                    nextHeader < nextItems.indexOf(nextAction)
                ) {
                    return false
                }
            }
            return true
        })

        return {content: filteredContent}
    }

    loadShareTokens(): void {
        const listEl = this.container?.querySelector("#share-token-list")
        if (!listEl) {
            return
        }
        listEl.innerHTML = `<p class="fw-ar-loading">${gettext("Loading…")}</p>`
        this.documentApi
            .listShareTokens(this.singleDocumentId as number)
            .then(({json}: {json: unknown}) => {
                const data = json as {tokens: ShareToken[]}
                listEl.innerHTML = shareTokenListTemplate({
                    tokens: data.tokens
                })
            })
            .catch(() => {
                listEl.innerHTML = `<p class="fw-ar-error">${gettext("Could not load share links.")}</p>`
            })
    }

    openCreateShareTokenDialog(): void {
        const createDialog = new Dialog({
            title: gettext("Create share link"),
            id: "create-share-token-dialog",
            width: 860,
            body: createShareTokenDialogTemplate(
                this.e2ee,
                this.documentPassword
            ),
            buttons: [
                {
                    text: gettext("Create"),
                    classes: "fw-dark",
                    click: () => {
                        const rights = (
                            createDialog.dialogEl.querySelector(
                                "#share-token-rights"
                            ) as HTMLSelectElement
                        ).value
                        const expiresRaw = (
                            createDialog.dialogEl.querySelector(
                                "#share-token-expires"
                            ) as HTMLInputElement
                        ).value
                        const note = (
                            createDialog.dialogEl.querySelector(
                                "#share-token-note"
                            ) as HTMLInputElement
                        ).value.trim()
                        this.documentApi
                            .createShareToken({
                                document_id: this.singleDocumentId,
                                rights,
                                expires_at: expiresRaw || "",
                                note
                            } as Record<string, unknown>)
                            .then(({json}: {json: unknown}) => {
                                const data = json as ShareToken
                                let shareUrl = data.share_url
                                if (this.e2ee) {
                                    const passwordInput =
                                        createDialog.dialogEl.querySelector(
                                            "#share-token-password"
                                        ) as HTMLInputElement | null
                                    const password = passwordInput
                                        ? passwordInput.value.trim()
                                        : ""
                                    if (password) {
                                        shareUrl = `${shareUrl}#?password=${encodeURIComponent(password)}`
                                    }
                                }
                                data.share_url = shareUrl
                                const listEl =
                                    this.container?.querySelector(
                                        "#share-token-list"
                                    )
                                const placeholder =
                                    listEl?.querySelector(".fw-ar-no-tokens")
                                if (placeholder) {
                                    placeholder.remove()
                                }
                                listEl?.insertAdjacentHTML(
                                    "beforeend",
                                    shareTokenRowTemplate({token: data})
                                )
                                addAlert(
                                    "success",
                                    gettext("Share link created.")
                                )
                            })
                            .catch(() =>
                                addAlert(
                                    "error",
                                    gettext("Could not create share link.")
                                )
                            )
                        createDialog.close()
                    }
                },
                {type: "cancel"}
            ]
        })
        createDialog.open()
        const expiresInput = createDialog.dialogEl.querySelector(
            "#share-token-expires"
        ) as HTMLInputElement
        enableDatePicker(expiresInput, true)
    }

    revokeShareToken(tokenId: number, rowEl: HTMLElement): void {
        this.documentApi
            .revokeShareToken(tokenId)
            .then(({json}: {json: unknown}) => {
                const data = json as {success: boolean}
                if (data.success) {
                    rowEl.remove()
                    const listEl =
                        this.container?.querySelector("#share-token-list")
                    if (!listEl?.querySelector(".share-token-row")) {
                        if (listEl) {
                            listEl.innerHTML = shareTokenListTemplate({tokens: []})
                        }
                    }
                    addAlert("success", gettext("Share link revoked."))
                } else {
                    addAlert("error", gettext("Could not revoke share link."))
                }
            })
            .catch(() =>
                addAlert("error", gettext("Could not revoke share link."))
            )
    }

    submit(): Promise<void> {
        const accessRights = collectAccessRights(this.container!)
        return this.documentApi
            .saveAccessRights({
                document_ids: this.documentIds,
                access_rights: accessRights
            })
            .then(() => {
                addAlert("success", gettext("Access rights have been saved"))
                if (this.onShareSuccess) {
                    this.onShareSuccess(accessRights)
                }
            })
            .catch(() =>
                addAlert("error", gettext("Access rights could not be saved"))
            )
    }
}

/**
 * Standalone dialog wrapper around AccessRightsTab.
 * Supports both single-document and bulk-document editing.
 */
export class DocumentAccessRightsDialog {
    documentIds: number[]
    contacts: Contact[]
    newContactCall: (contactData: Contact) => void
    e2ee: boolean
    documentPassword: string
    onShareSuccess?: (accessRights: AccessRight[]) => void
    settings: Record<string, unknown>
    isOwner: boolean
    contactsApi: EditorContactsApi
    documentApi: EditorDocumentApi
    tab!: AccessRightsTab
    dialog!: Dialog

    constructor(
        documentIds: number[],
        contacts: Contact[],
        newContactCall: (contactData: Contact) => void,
        e2ee: boolean,
        documentPassword = "",
        onShareSuccess?: (accessRights: AccessRight[]) => void,
        settings: Record<string, unknown> = {},
        isOwner = false,
        contactsApi?: EditorContactsApi,
        documentApi?: EditorDocumentApi
    ) {
        this.documentIds = documentIds
        this.contacts = contacts
        this.newContactCall = newContactCall
        this.e2ee = e2ee
        this.documentPassword = documentPassword
        this.onShareSuccess = onShareSuccess
        this.settings = settings
        this.isOwner = isOwner
        this.contactsApi = contactsApi as EditorContactsApi
        this.documentApi = documentApi as EditorDocumentApi
    }

    init(): void {
        this.tab = new AccessRightsTab({
            documentIds: this.documentIds,
            contacts: this.contacts,
            newContactCall: this.newContactCall,
            e2ee: this.e2ee,
            documentPassword: this.documentPassword,
            onShareSuccess: this.onShareSuccess,
            settings: this.settings,
            documentApi: this.documentApi,
            contactsApi: this.contactsApi,
            isOwner: this.isOwner
        })
        this.tab.load().then(() => this.createDialog())
    }

    createDialog(): void {
        const html = this.tab.render()

        const buttons = [
            {
                text:
                    (this.settings?.REGISTRATION_OPEN as boolean | undefined) ||
                    (this.settings?.SOCIALACCOUNT_OPEN as boolean | undefined)
                        ? gettext("Add contact or invite new user")
                        : gettext("Add contact"),
                classes: "fw-light fw-add-button",
                click: () => {
                    const dialog = new AddContactDialog(
                        this.settings,
                        this.contactsApi
                    )
                    dialog.init().then(contactsData => {
                        ;(contactsData as Contact[]).forEach(contactData => {
                            if (contactData.id) {
                                this.tab.container
                                    ?.querySelector(
                                        "#my-contacts .fw-data-table-body"
                                    )
                                    ?.insertAdjacentHTML(
                                        "beforeend",
                                        contactsTemplate({
                                            contacts: [contactData]
                                        })
                                    )
                                this.tab.container
                                    ?.querySelector("#share-contact table tbody")
                                    ?.insertAdjacentHTML(
                                        "beforeend",
                                        collaboratorsTemplate({
                                            collaborators: [
                                                {
                                                    holder: contactData,
                                                    rights: "read",
                                                    count: 1
                                                }
                                            ]
                                        })
                                    )
                                this.newContactCall(contactData)
                            } else {
                                this.tab.container
                                    ?.querySelector("#share-contact table tbody")
                                    ?.insertAdjacentHTML(
                                        "beforeend",
                                        collaboratorsTemplate({
                                            collaborators: [
                                                {
                                                    holder: contactData,
                                                    rights: "read",
                                                    count: 1
                                                }
                                            ]
                                        })
                                    )
                            }
                        })
                    })
                }
            },
            {
                text: gettext("Submit"),
                classes: "fw-dark",
                click: () => {
                    this.tab.submit().then(() => this.dialog.close())
                }
            },
            {
                type: "cancel" as const
            }
        ]

        this.dialog = new Dialog({
            title: gettext("Share your document with others"),
            id: "access-rights-dialog",
            width: 820,
            height: 440,
            body: html,
            buttons
        })
        this.dialog.open()

        // Set the container so events/bindings work on the dialog element
        this.tab.container = this.dialog.dialogEl
        this.tab.bindEvents()

        // Hide the share-link tab when multiple documents are selected
        if (!this.tab.singleDocumentId) {
            const shareTab = this.dialog.dialogEl.querySelector(
                ".fw-tabs-nav .fw-tab-link a[href='#sharelink']"
            )?.parentNode
            if (shareTab) {
                ;(shareTab as HTMLElement).style.display = "none"
            }
        }
    }
}
