import {localizeDate, whenReady} from "fwtoolkit"
import {E2EEEncryptor} from "fwtoolkit/e2ee/encryptor"

import {messageTemplate} from "./templates.js"

interface ChatMessage {
    id: number
    from: number
    body: string
    e2ee?: boolean
}

interface Participant {
    id: number
    name?: string
}

/*
 * Functions for chat between users who access a document simultaneously.
 */

export class ModCollabChat {
    mod: any
    currentlyFlashing: boolean
    focus: boolean

    constructor(mod: any) {
        mod.chat = this
        this.mod = mod
        this.currentlyFlashing = false
        this.focus = true
        this.init()
    }

    beep(): void {
        const notification = document.getElementById(
            "chat-notification"
        ) as HTMLAudioElement | null
        if (!notification) {
            return
        }
        notification.play().catch(
            () => {} // Don't worry about it if the browser prohibits playing the sound
        )
    }

    flashtab(messageTitle: string): void {
        if (this.currentlyFlashing) {
            return
        }
        const origTitle = document.title

        this.currentlyFlashing = true

        const changeDocumentTitle = window.setInterval(() => {
            if (this.focus) {
                window.clearInterval(changeDocumentTitle)
                document.title = origTitle
                this.currentlyFlashing = false
            } else {
                document.title =
                    document.title === origTitle ? messageTitle : origTitle
            }
        }, 500)
    }

    async newMessage(message: ChatMessage): Promise<void> {
        if (document.getElementById(`m${message.id}`)) {
            return
        }

        // For E2EE documents, decrypt the chat message body.
        if (message.e2ee) {
            const isE2EE =
                this.mod.editor.e2ee &&
                this.mod.editor.e2ee.encrypted &&
                this.mod.editor.e2ee.key
            if (isE2EE) {
                try {
                    message.body = await E2EEEncryptor.decrypt(
                        message.body,
                        this.mod.editor.e2ee.key as CryptoKey
                    )
                } catch (error) {
                    console.error("E2EE: Failed to decrypt chat message", error)
                    message.body = gettext(
                        "[Encrypted message - decryption failed]"
                    )
                }
            } else {
                message.body = gettext(
                    "[Encrypted message - enter password to read]"
                )
            }
        }

        const theChatter = (this.mod.participants as Participant[]).find(
            (participant: Participant) => participant.id === message.from
        )

        const chatContainer = document.getElementById("chat-container")
        if (!chatContainer) {
            return
        }
        chatContainer.insertAdjacentHTML(
            "beforeend",
            messageTemplate({
                message,
                theChatter: theChatter || ({name: ""} as Participant),
                localizeDate
            } as any)
        )
        if (!this.focus) {
            this.beep()
            this.flashtab(message.from + ": " + message.body)
        }
        if (chatContainer.style.display === "none") {
            document.getElementById("chat")?.classList.add("highlighted")
        }
    }

    showChat(participants: Participant[]): void {
        // If only one machine is connected and nothing has been chatted, don't show chat
        if (
            participants.length === 1 &&
            !document.querySelector("#chat-container .fw-message")
        ) {
            const chatEl = document.getElementById("chat")
            if (chatEl) {
                chatEl.style.display = "none"
            }
        } else {
            const chatEl = document.getElementById("chat")
            if (chatEl) {
                chatEl.style.display = "block"
            }
        }
    }

    async sendMessage(messageText: string): Promise<void> {
        // For E2EE documents, encrypt the chat message body.
        // The server relays encrypted messages without reading them.
        const isE2EE =
            this.mod.editor.e2ee &&
            this.mod.editor.e2ee.encrypted &&
            this.mod.editor.e2ee.key

        if (isE2EE) {
            try {
                const encryptedBody = await E2EEEncryptor.encrypt(
                    messageText,
                    this.mod.editor.e2ee.key as CryptoKey
                )
                ;(this.mod.editor.ws as WebSocket).send((() => ({
                    type: "chat",
                    body: encryptedBody,
                    e2ee: true
                })) as any)
            } catch (error) {
                console.error("E2EE: Failed to encrypt chat message", error)
                // Fall back to sending unencrypted (should not happen
                // in normal operation)
                ;(this.mod.editor.ws as WebSocket).send((() => ({
                    type: "chat",
                    body: messageText
                })) as any)
            }
        } else {
            ;(this.mod.editor.ws as WebSocket).send((() => ({
                type: "chat",
                body: messageText
            })) as any)
        }
    }

    init(): void {
        this.mod.editor.dom.insertAdjacentHTML(
            "beforeend",
            `<style>\n#messageform.empty:before{content:"${gettext("Send a message...")}"}\n</style>`
        )
        whenReady().then(() => {
            const chatContainer = document.getElementById("chat-container")
            if (chatContainer) {
                chatContainer.style.maxHeight = `${window.innerHeight - 200}px`
            }

            const resizeButton = document.querySelector(
                "#chat .resize-button"
            )
            if (!resizeButton) {
                return
            }
            resizeButton.addEventListener("click", () => {
                const chatEl = document.getElementById("chat")
                if (!chatEl) {
                    return
                }
                if (
                    resizeButton.classList.contains("fa-angle-double-down")
                ) {
                    resizeButton.classList.remove("fa-angle-double-down")
                    resizeButton.classList.add("fa-angle-double-up")
                    chatEl.style.top = `${chatEl.getBoundingClientRect().top}px` // Set current height to get the animation working.
                    setTimeout(
                        () =>
                            (chatEl.style.top = `${window.innerHeight - 29}px`),
                        0
                    )
                } else {
                    resizeButton.classList.remove("fa-angle-double-up")
                    resizeButton.classList.add("fa-angle-double-down")
                    // Add height teemporarily to make sliding animation.
                    chatEl.style.top = `${Math.max(window.innerHeight - chatEl.scrollHeight - 11, 0)}px` // 11px for padding
                    setTimeout(() => (chatEl.style.top = ""), 3000)
                }
            })

            const messageForm = document.getElementById("messageform")
            if (!messageForm) {
                return
            }

            messageForm.addEventListener("focus", () =>
                messageForm.classList.remove("empty")
            )

            messageForm.addEventListener("blur", () => {
                if (messageForm.innerText.trim().length === 0) {
                    messageForm.classList.add("empty")
                }
            })

            messageForm.addEventListener("keypress", event => {
                if (event.keyCode === 13) {
                    this.sendMessage(messageForm.innerText)
                    messageForm.innerText = ""
                    return false
                }
                return
            })
        })

        window.addEventListener("blur", () => (this.focus = false))
        window.addEventListener("focus", () => (this.focus = true))
    }
}
