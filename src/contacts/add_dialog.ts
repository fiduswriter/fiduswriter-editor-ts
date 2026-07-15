import {Dialog, cancelPromise, escapeText, postJson} from "fwtoolkit"
import {addContactTemplate} from "./templates.js"

interface ContactResponse {
    contact?: unknown
    error?: number
}

//dialog for adding a user to contacts
export class AddContactDialog {
    settings: Record<string, unknown>

    constructor(settings: Record<string, unknown>) {
        this.settings = settings
    }

    init(): Promise<unknown[]> {
        return new Promise(resolve => {
            const buttons = [
                {
                    text: gettext("Submit"),
                    classes: "fw-dark",
                    click: () => {
                        const userString = (
                            document.getElementById(
                                "new-contact-user-string"
                            ) as HTMLInputElement
                        ).value
                        document
                            .querySelectorAll("#add-new-contact .fw-warning")
                            .forEach(el =>
                                el.parentElement?.removeChild(el)
                            )
                        const userStrings = userString.split(/[\s,;]+/)
                        let chain: Promise<unknown[]> = Promise.resolve([])

                        userStrings
                            .filter(singleUserString => singleUserString.length)
                            .forEach(
                                singleUserString =>
                                    (chain = chain.then(responses =>
                                        this.addContact(singleUserString).then(
                                            data => [...responses, data]
                                        )
                                    ))
                            )
                        Promise.resolve(chain).then(contactData => {
                            if (contactData.length) {
                                dialog.close()
                                resolve(contactData)
                            }
                        })
                    }
                },
                {
                    type: "cancel" as const
                }
            ]

            const dialog = new Dialog({
                id: "add-new-contact",
                title:
                    this.settings?.REGISTRATION_OPEN ||
                    this.settings?.SOCIALACCOUNT_OPEN
                        ? gettext("Add contact or invite new user")
                        : gettext("Add contact"),
                body: addContactTemplate(),
                width: 350,
                height: 250,
                buttons
            })

            dialog.open()

            ;(
                document.getElementById(
                    "new-contact-user-string"
                ) as HTMLElement
            ).style.width = "340"
        })
    }

    async addContact(userString: string): Promise<unknown> {
        //add a user to contact per ajax
        if (null === userString || "undefined" == typeof userString) {
            return cancelPromise()
        }

        userString = userString.trim()
        if ("" === userString) {
            return cancelPromise()
        }

        const {json, status} = (await postJson("/api/user/invites/add/", {
            user_string: userString
        })) as {json: ContactResponse; status: number}
        if (status == 201) {
            //user added to the contacts
            return json.contact
        } else {
            //user not found
            let responseHtml
            if (json.error === 1) {
                responseHtml = gettext(
                    "You cannot add yourself to your contacts!"
                )
            } else if (json.error === 2) {
                responseHtml = gettext(
                    "This person is already in your contacts!"
                )
            } else if (json.error === 3) {
                responseHtml = gettext("Invalid email!")
            }
            document
                .getElementById("add-new-contact")
                ?.insertAdjacentHTML(
                    "beforeend",
                    `<div class="fw-warning" style="padding: 8px;">${escapeText(userString)}: ${responseHtml}</div>`
                )
            return cancelPromise()
        }
    }
}
