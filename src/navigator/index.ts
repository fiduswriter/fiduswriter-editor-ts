import type {Node as ProseMirrorNode} from "prosemirror-model"
import {escapeText, findTarget} from "fwtoolkit"

import type {Editor} from "../types.js"

interface NavigatorFilterItem {
    level: number
    title: string
}

interface NavigatorItem {
    id: string
    textContent: string
    type: {name: string}
    class?: string
}

export class ModNavigator {
    editor: Editor
    navigatorEl: HTMLElement | null
    listeners: Record<string, any>
    navigatorFilters: NavigatorFilterItem[]
    defaultFilters: string[]
    lastSelectedTarget: string | null

    constructor(editor: Editor) {
        editor.mod.navigator = this
        this.editor = editor
        this.navigatorEl = document.querySelector("#navigator")
        this.listeners = {}
        this.navigatorFilters = (editor.menu as any).navigatorFilterModel.content
        this.defaultFilters = ["heading1", "heading2", "heading3"]

        this.lastSelectedTarget = null
    }

    init(): void {
        this.render()
        this.bindEvents()
    }

    render(): void {
        if (this.navigatorEl) {
            this.navigatorEl.innerHTML = this.getNavigatorTemplate()
        }
    }

    bindEvents(): void {
        this.editor.dom.addEventListener("click", event => {
            const el: {target?: HTMLElement} = {}
            switch (true) {
                case findTarget(event, "#navigator-button", el):
                    if (this.navigatorEl?.classList.contains("opened")) {
                        this.closeNavigator()
                    } else {
                        const navigatorListEl =
                            document.getElementById("navigator-list")
                        if (navigatorListEl) {
                            navigatorListEl.innerHTML =
                                this.populateNavigator() || ""
                        }
                        this.openNavigator()
                        const activeHeading = this.navigatorEl?.querySelector(
                            "#navigator-list .active-heading a"
                        )
                        if (activeHeading) {
                            ;(activeHeading as HTMLElement).focus()
                        } else {
                            const firstFocusable =
                                this.navigatorEl?.querySelector(
                                    "#navigator-list [href]"
                                )
                            if (firstFocusable) {
                                ;(firstFocusable as HTMLElement).focus()
                            }
                        }
                    }
                    break
                case findTarget(event, "#navigator-list a", el): {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    const target = (el.target as HTMLElement)
                        .getAttribute("href")
                        ?.slice(1)

                    if (target == "title") {
                        this.editor.scrollPosIntoView(1, this.editor.view)
                        this.lastSelectedTarget = "title"
                    } else if (target == "bibliography") {
                        this.editor.scrollBibliographyIntoView(target)
                    } else if (target) {
                        // Store the selected target ID for later focus
                        this.lastSelectedTarget = target
                        this.editor.scrollIdIntoView(target)
                        this.switchActiveHeading(
                            (el.target as HTMLElement).parentNode as HTMLElement
                        )
                    }

                    // Keep focus on the navigation menu item
                    ;(el.target as HTMLElement).focus()
                    break
                }
                case findTarget(event, "#navigator-filter-icon", el): {
                    const navigatorFilterEl =
                        document.getElementById("navigator-filter")
                    if (navigatorFilterEl?.classList.contains("fw-hide")) {
                        this.showFilters()
                    } else {
                        this.hideFilters()
                    }
                    break
                }
                case findTarget(event, "#navigator-filter-back", el): {
                    this.defaultFilters = []
                    document
                        .querySelectorAll("#navigator-filter input")
                        .forEach(item => {
                            if ((item as HTMLInputElement).checked) {
                                this.defaultFilters.push(item.id)
                            }
                        })
                    const navigatorListEl =
                        document.getElementById("navigator-list")
                    if (navigatorListEl) {
                        navigatorListEl.innerHTML =
                            this.populateNavigator() || ""
                    }
                    this.hideFilters()
                    break
                }
                case findTarget(event, "input", el):
                    break
                case findTarget(event, "label", el):
                    break
                default:
                    this.closeNavigator()
                    break
            }
        })

        this.editor.dom
            .querySelector("#navigator-list")
            ?.addEventListener("mouseover", () => {
                this.editor.dom.classList.add("no-scroll")
            })
        this.editor.dom
            .querySelector("#navigator-list")
            ?.addEventListener("mouseout", () => {
                this.editor.dom.classList.remove("no-scroll")
            })
        this.editor.dom.addEventListener("keydown", event => {
            // Alt+n shortcut to toggle navigator
            if (event.altKey && event.key.toLowerCase() === "n") {
                event.preventDefault()
                if (this.navigatorEl?.classList.contains("opened")) {
                    this.closeNavigator()
                } else {
                    const navigatorListEl =
                        document.getElementById("navigator-list")
                    if (navigatorListEl) {
                        navigatorListEl.innerHTML =
                            this.populateNavigator() || ""
                    }
                    this.openNavigator()
                    const activeHeading = this.navigatorEl?.querySelector(
                        "#navigator-list .active-heading a"
                    )
                    if (activeHeading) {
                        ;(activeHeading as HTMLElement).focus()
                    } else {
                        const firstFocusable =
                            this.navigatorEl?.querySelector(
                                "#navigator-list [href]"
                            )
                        if (firstFocusable) {
                            ;(firstFocusable as HTMLElement).focus()
                        }
                    }
                }
            }

            const navigatorEl = document.getElementById("navigator")

            if (!navigatorEl || !navigatorEl.classList.contains("opened")) {
                // If the navigator is not opened, do nothing
                return
            }

            // Inside the navigator, handle keyboard navigation

            if (event.key === "Escape") {
                this.closeNavigator()
                return
            }

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                event.stopImmediatePropagation()
                const activeElement = document.activeElement
                if (activeElement && activeElement.tagName === "A") {
                    ;(activeElement as HTMLElement).click()
                }
            }

            // Tab key navigation (keep focus inside dialog)
            if (event.key === "Tab") {
                const focusableElements = navigatorEl.querySelectorAll(
                    'button, [href], input, [tabindex="0"]'
                )
                if (focusableElements.length > 0) {
                    const firstElement = focusableElements[0] as HTMLElement
                    const lastElement = focusableElements[
                        focusableElements.length - 1
                    ] as HTMLElement

                    if (
                        event.shiftKey &&
                        document.activeElement === firstElement
                    ) {
                        event.preventDefault()
                        lastElement.focus()
                    } else if (
                        !event.shiftKey &&
                        document.activeElement === lastElement
                    ) {
                        event.preventDefault()
                        firstElement.focus()
                    }
                }
                return
            }

            const navigatorListEl = document.getElementById("navigator-list")

            // Arrow key navigation within the list
            if (
                navigatorListEl &&
                !navigatorListEl.classList.contains("fw-hide") &&
                (event.key === "ArrowDown" || event.key === "ArrowUp")
            ) {
                event.preventDefault()

                const links = navigatorListEl.querySelectorAll("a")
                if (links.length === 0) {
                    return
                }

                let currentIndex = -1
                links.forEach((link, index) => {
                    if (document.activeElement === link) {
                        currentIndex = index
                    }
                })

                let newIndex: number
                if (event.key === "ArrowDown") {
                    newIndex =
                        currentIndex < links.length - 1 ? currentIndex + 1 : 0
                } else {
                    // ArrowUp
                    newIndex =
                        currentIndex > 0 ? currentIndex - 1 : links.length - 1
                }

                ;(links[newIndex] as HTMLElement).focus()
                return
            }

            const navigatorFilterEl =
                document.getElementById("navigator-filter")

            // Arrow key navigation within the filter menu
            if (
                navigatorFilterEl &&
                !navigatorFilterEl.classList.contains("fw-hide") &&
                (event.key === "ArrowDown" || event.key === "ArrowUp")
            ) {
                event.preventDefault()

                const checkboxes = navigatorFilterEl.querySelectorAll(
                    'input[type="checkbox"]'
                )
                if (checkboxes.length === 0) {
                    return
                }

                let currentIndex = -1
                checkboxes.forEach((checkbox, index) => {
                    if (document.activeElement === checkbox) {
                        currentIndex = index
                    }
                })

                let newIndex: number
                if (event.key === "ArrowDown") {
                    newIndex =
                        currentIndex < checkboxes.length - 1
                            ? currentIndex + 1
                            : 0
                } else {
                    // ArrowUp
                    newIndex =
                        currentIndex > 0
                            ? currentIndex - 1
                            : checkboxes.length - 1
                }

                ;(checkboxes[newIndex] as HTMLElement).focus()
                return
            }
        })
    }

    switchActiveHeading(new_heading: HTMLElement): void {
        Array.prototype.forEach.call(
            document.querySelectorAll("#navigator-list .active-heading"),
            active_heading => active_heading.classList.remove("active-heading")
        )
        new_heading.classList.add("active-heading")
    }

    openNavigator(): void {
        const navigatorEl = document.getElementById("navigator")
        const navigatorButtonEl = document.getElementById("navigator-button")
        const navigatorFilterEl = document.getElementById("navigator-filter")
        const navigatorListEl = document.getElementById("navigator-list")
        const navigatorFilterBackEl = document.getElementById(
            "navigator-filter-back"
        )
        const navigatorFilterIconEl = document.getElementById(
            "navigator-filter-icon"
        )
        if (
            !navigatorEl ||
            !navigatorFilterEl ||
            !navigatorListEl ||
            !navigatorFilterBackEl ||
            !navigatorFilterIconEl
        ) {
            return
        }
        navigatorEl.classList.add("opened")
        navigatorFilterEl.classList.add("fw-hide")
        navigatorListEl.classList.remove("fw-hide")
        navigatorFilterBackEl.classList.add("fw-hide")
        navigatorFilterIconEl.classList.remove("fw-hide")
        navigatorButtonEl?.setAttribute("aria-expanded", "true")
        this.scrollToActiveHeading()
    }

    scrollToActiveHeading(): void {
        const listEl = document.getElementById("navigator-list")
        const activeHeading = listEl?.querySelector(".active-heading")
        if (activeHeading) {
            activeHeading.scrollIntoView()
        }
    }

    closeNavigator(): void {
        const navigatorEl = document.getElementById("navigator")
        const navigatorButtonEl = document.getElementById("navigator-button")
        if (navigatorEl) {
            navigatorEl.classList.remove("opened")
            navigatorButtonEl?.setAttribute("aria-expanded", "false")
        }

        if (this.lastSelectedTarget) {
            const target =
                this.lastSelectedTarget == "title"
                    ? this.editor.dom.querySelector(`div.doc-title`)
                    : this.editor.dom.querySelector(`#${this.lastSelectedTarget}`)
            if (target) {
                // Set selection at end of target.
                const range = document.createRange()
                const selection = window.getSelection()
                range.selectNodeContents(target)
                range.collapse()
                selection?.removeAllRanges()
                selection?.addRange(range)
                ;(target as HTMLElement).focus()
            }
            this.lastSelectedTarget = null
        }
    }

    showFilters(): void {
        const navigatorFilterEl = document.getElementById("navigator-filter")
        const navigatorListEl = document.getElementById("navigator-list")
        const navigatorFilterBackEl = document.getElementById(
            "navigator-filter-back"
        )
        const navigatorFilterIconEl = document.getElementById(
            "navigator-filter-icon"
        )
        if (
            !navigatorFilterEl ||
            !navigatorFilterBackEl ||
            !navigatorListEl ||
            !navigatorFilterIconEl
        ) {
            return
        }
        navigatorFilterEl.classList.remove("fw-hide")
        navigatorFilterBackEl.classList.remove("fw-hide")
        navigatorListEl.classList.add("fw-hide")
        navigatorFilterIconEl.classList.add("fw-hide")
        //populating the filter list
        navigatorFilterEl.innerHTML = this.populateNavFilter()
    }

    hideFilters(): void {
        const navigatorFilterEl = document.getElementById("navigator-filter")
        const navigatorListEl = document.getElementById("navigator-list")
        const navigatorFilterBackEl = document.getElementById(
            "navigator-filter-back"
        )
        const navigatorFilterIconEl = document.getElementById(
            "navigator-filter-icon"
        )
        if (
            !navigatorFilterEl ||
            !navigatorFilterBackEl ||
            !navigatorListEl ||
            !navigatorFilterIconEl
        ) {
            return
        }
        navigatorFilterEl.classList.add("fw-hide")
        navigatorFilterBackEl.classList.add("fw-hide")
        navigatorListEl.classList.remove("fw-hide")
        navigatorFilterIconEl.classList.remove("fw-hide")

        this.scrollToActiveHeading()
    }

    populateNavigator(): string | false {
        const currentPos = this.editor.view.state.selection.$head.pos
        const title =
            this.editor.dom.querySelector("div.doc-title")?.textContent ||
            gettext("Untitled Document")
        const items: NavigatorItem[] = [
            {
                id: "title",
                textContent: title,
                type: {name: "h1"}
            }
        ]
        let nearestHeader: ProseMirrorNode | "" = ""
        this.editor.view.state.doc.descendants((node, pos) => {
            if (node.attrs?.hidden) {
                return false
            } else if (
                this.defaultFilters.includes(node.type.name) &&
                node.textContent !== ""
            ) {
                if (pos <= currentPos) {
                    nearestHeader = node
                } else if (nearestHeader !== "") {
                    items[items.length - 1] = Object.assign(
                        {},
                        items[items.length - 1],
                        {
                            class: "active-heading"
                        }
                    )
                    nearestHeader = ""
                }
                items.push({
                    id: node.attrs.id,
                    textContent: node.textContent,
                    type: node.type
                })
            }
            return undefined
        })
        const bibHeader = document.querySelector("h1.doc-bibliography-header")
        if (bibHeader) {
            items.push({
                id: "bibliography",
                textContent: bibHeader.textContent || "",
                type: {name: "h1"}
            })
        }
        if (items.length) {
            return this.navigatorHTML(items)
        } else {
            return false
        }
    }

    populateNavFilter(): string {
        return this.navigatorFilters
            .map(item => {
                const level = item.level
                const id = `heading${level}`
                return `<div role="menuitem">
                            <input type="checkbox" class="form-checkbox" id="${id}" ${this.inDefault(level)} aria-labelledby="label-${id}" />
                            <label id="label-${id}" class="navigator-label" for="${id}">${item.title}</label>
                        </div>`
            })
            .join("")
    }

    inDefault(level: number): string {
        if (this.defaultFilters.includes("heading" + level)) {
            return "checked"
        } else {
            return ""
        }
    }

    navigatorHTML(items: NavigatorItem[]): string {
        return `
            ${items
                .map(item => {
                    const level = item.type.name.substr(-1)
                    const className = item.class ? ` class="${item.class}"` : ""
                    return `<h${level}${className}><a href="#${item.id}" tabindex="0">${escapeText(item.textContent)}</a></h${level}>`
                })
                .join("")}`
    }

    getNavigatorTemplate(): string {
        return `
            <div id="navigator-content" role="dialog" aria-labelledby="navigator-header">
                <div class="header-container">
                    <button id="navigator-filter-back" class="fw-hide" aria-label="${gettext("Back to navigator")}" tabindex="0">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h1 id="navigator-header" class="header">${gettext("Document Navigator")}</h1>
                    <button id="navigator-filter-icon" aria-label="${gettext("Navigator settings")}" tabindex="0">
                        <i class="fa-solid fa-cog"></i>
                    </button>
                </div>
                <div id="navigator-list" role="navigation" aria-label="${gettext("Document headings")}">
                </div>
                <div id="navigator-filter" class="fw-hide" role="menu" aria-label="${gettext("Filter options")}">
                </div>
            </div>
            <button id="navigator-button"
                aria-expanded="false"
                aria-label="${gettext("Toggle document navigator")}"
                title="${gettext("Document N̲avigator")}">
                <span class="navigator-arrow-icon"><i class="fa-solid fa-scroll"></i></span>
            </button>
            `
    }
}
