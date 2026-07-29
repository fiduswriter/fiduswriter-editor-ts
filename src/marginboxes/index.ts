import {DiffDOM, stringToObj} from "diff-dom"
import fastdom from "fastdom"
import type {Node} from "prosemirror-model"
import type {Selection} from "prosemirror-state"
import type {EditorView} from "prosemirror-view"

import {cancelPromise, findTarget} from "fwtoolkit"
import {READ_ONLY_ROLES} from "../index.js"
import {
    getCommentDuringCreationDecoration,
    getFootnoteMarkers
} from "../state_plugins/index.js"
import {getSelectedChanges} from "../state_plugins/track/index.js"
import type {Editor} from "../types.js"
import {
    globalCommentsTemplate,
    marginBoxOptions,
    marginBoxesTemplate,
    marginboxFilterTemplate
} from "./templates.js"
import type {
    Comment,
    MarginBox,
    MarginBoxFilterOptions,
    Participant
} from "./templates.js"

interface SelectedChanges {
    insertion?: {from: number; to: number}
    deletion?: {from: number; to: number}
    format_change?: {from: number; to: number}
    block_change?: {from: number; to: number}
}

interface NodeTrack {
    type: string
    data: Record<string, unknown>
}

interface CommentInteractions {
    createNewGlobalComment(): void
    deactivateSelectedChanges(): void
    activateComment(id: string): void
    isCurrentlyEditing(): boolean
    activateSelectedComment(view: EditorView): void
    editComment: boolean
    activeCommentAnswerId: number | string | undefined
    activeCommentId: number | string | undefined
    findCommentIds(node: Node): string[]
}

interface CommentStore {
    commentDuringCreation?: {
        comment: Comment
        inDOM?: boolean
    }
    comments: Record<string, Comment>
    findComment(id: string): Comment | undefined
}

interface CommentsMod {
    interactions: CommentInteractions
    store: CommentStore
}

interface CollabMod {
    pastParticipants: Participant[]
}

interface FootnotesMod {
    fnEditor: {view: EditorView}
}

interface TrackMod {
    activateTrack(view: string, type: string, pos: number): void
}

interface MarginboxesEditorMod {
    comments: CommentsMod
    collab: CollabMod
    footnotes: FootnotesMod
    track: TrackMod
    marginboxes: ModMarginboxes
}

interface MarginBoxPlacement {
    height: number
    refPos: number
    pos?: number
}

/* Functions related to layouting of comments */
export class ModMarginboxes {
    editor: Editor & {mod: MarginboxesEditorMod}
    activeCommentStyle: string
    filterOptions: MarginBoxFilterOptions
    commentColors: {isMajor: string; marker: string; active: string}
    dd: DiffDOM
    marginBoxesContainerString: string
    marginBoxesContainerObj: ReturnType<typeof stringToObj>
    globalCommentsContainerString: string
    globalCommentsContainerObj: ReturnType<typeof stringToObj>
    marginBoxesPlacementStyle: string
    marginBoxes: MarginBox[]
    marginBoxesContainer: HTMLElement | null
    globalCommentsContainer: HTMLElement | null
    activeCommentStyleElement: HTMLElement | null
    trackOptionsStyleElement: HTMLElement | null

    constructor(editor: Editor) {
        this.editor = editor as Editor & {mod: MarginboxesEditorMod}
        this.editor.mod.marginboxes = this
        this.activeCommentStyle = ""
        this.filterOptions = {
            track: true,
            comments: true,
            info: true,
            help: true,
            warning: true,
            commentsResolved: false,
            author: 0,
            assigned: 0
        }
        this.commentColors = {
            isMajor: "#f4c9d9",
            marker: "#f9f9f9",
            active: "#fffacf"
        }
        this.dd = new DiffDOM({
            valueDiffing: false
        })
        this.marginBoxesContainerString =
            '<div id="margin-box-container"><div></div></div>'
        this.marginBoxesContainerObj = stringToObj(
            this.marginBoxesContainerString
        )
        this.globalCommentsContainerString =
            '<div id="global-comment-container"><div></div></div>'
        this.globalCommentsContainerObj = stringToObj(
            this.globalCommentsContainerString
        )
        this.marginBoxesPlacementStyle = ""
        this.marginBoxes = []
        this.marginBoxesContainer = null
        this.globalCommentsContainer = null
        this.activeCommentStyleElement = null
        this.trackOptionsStyleElement = null
    }

    init() {
        // Add two elements to hold dynamic CSS info about comments.
        document.body.insertAdjacentHTML(
            "beforeend",
            '<style type="text/css" id="active-comment-style"></style><style type="text/css" id="track-options-style"></style><style type="text/css" id="margin-box-placement-style"></style>'
        )
        this.marginBoxesContainer = document.getElementById(
            "margin-box-container"
        )
        this.globalCommentsContainer = document.getElementById(
            "global-comment-container"
        )
        this.activeCommentStyleElement = document.getElementById(
            "active-comment-style"
        )
        this.trackOptionsStyleElement = document.getElementById(
            "track-options-style"
        )
        const newGlobalCommentButton =
            document.getElementById("new-global-comment")
        if (
            newGlobalCommentButton &&
            READ_ONLY_ROLES.includes(
                this.editor.docInfo.access_rights || ""
            )
        ) {
            newGlobalCommentButton.classList.add("fw-hide")
        }
        this.bindEvents()
    }

    findShowMoreButton(event: Event): Element | null {
        const target = event.target
        if (target instanceof Element) {
            return target.closest(".show-more-less")
        }
        if (!target) {
            return null
        }
        const parent = (target as {parentElement?: Element | null})
            .parentElement
        return parent ? parent.closest(".show-more-less") : null
    }

    bindEvents() {
        // Bind all the click events related to the margin box filter
        document.body.addEventListener("click", async event => {
            const el: {target?: Element | null} = {}
            const showMoreButton = this.findShowMoreButton(event)
            switch (true) {
                case findTarget(event, "#new-global-comment", el):
                    this.editor.mod.comments.interactions.createNewGlobalComment()
                    break
                case findTarget(event, ".margin-box-filter-check", el):
                    // do not react to clicks on checkboxes within sub menus
                    break
                case findTarget(
                    event,
                    ".margin-box-filter-comments-author",
                    el
                ): {
                    const target = el.target as HTMLElement | null | undefined
                    this.filterOptions.commentsAuthor = Number.parseInt(
                        target?.dataset.id || "0"
                    )
                    this.view(this.editor.currentView)
                    break
                }
                case findTarget(
                    event,
                    ".margin-box-filter-comments-assigned",
                    el
                ): {
                    const target = el.target as HTMLElement | null | undefined
                    this.filterOptions.assigned = Number.parseInt(
                        target?.dataset.id || "0"
                    )
                    this.view(this.editor.currentView)
                    break
                }
                case findTarget(event, ".show-marginbox-options-submenu", el): {
                    const target = el.target as HTMLElement | null | undefined
                    this.closeAllMenus(".marginbox-options-submenu.fw-open")
                    const submenu = Array.from(
                        target?.parentElement?.children || []
                    ).find(node =>
                        node.matches(".marginbox-options-submenu")
                    ) as HTMLElement | undefined
                    submenu?.classList.add("fw-open")
                    break
                }
                case findTarget(event, ".show-marginbox-options", el): {
                    const target = el.target as HTMLElement | null | undefined
                    this.closeAllMenus()
                    if (
                        target?.parentElement?.classList.contains(
                            "margin-box-filter-button"
                        )
                    ) {
                        const options = Array.from(
                            target.parentElement.children
                        ).find(node => node.matches(".fw-marginbox-options"))
                        if (options) {
                            ;(options as HTMLElement).classList.add("fw-open")
                        }
                    } else {
                        let resolved = false
                        if (target?.parentElement?.parentElement) {
                            resolved =
                                target.parentElement.parentElement.classList.contains(
                                    "resolved"
                                )
                        }
                        const user = this.editor.user
                        const docInfo = this.editor.docInfo
                        const elData = (target as HTMLElement).dataset
                        const comment = {
                            answer: elData.hasOwnProperty("answer"),
                            id: elData.id || "",
                            commentId: elData.commentid || "",
                            user: Number(elData.commentuser || 0),
                            resolved
                        }
                        document.body.insertAdjacentHTML(
                            "beforeend",
                            marginBoxOptions(comment, user, docInfo)
                        )
                        const marginboxOptions = document.body.querySelector(
                            ".comment-answer-options.fw-marginbox-options"
                        )
                        if (marginboxOptions && target) {
                            marginboxOptions.classList.add("fw-open")
                            this.positionMarginBoxOptions(
                                marginboxOptions as HTMLElement,
                                target
                            )
                        }
                    }
                    break
                }
                case findTarget(event, ".margin-box-filter-track-author", el): {
                    const target = el.target as HTMLElement | null | undefined
                    this.filterOptions.trackAuthor = Number.parseInt(
                        target?.dataset.id || "0"
                    )
                    this.setTrackStyle()
                    this.view(this.editor.currentView)
                    break
                }
                case findTarget(event, "#margin-box-filter-track", el):
                    this.filterOptions.track = !this.filterOptions.track
                    this.setTrackStyle()
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, "#margin-box-filter-comments", el):
                    this.filterOptions.comments = !this.filterOptions.comments
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, "#margin-box-filter-info", el):
                    this.filterOptions.info = !this.filterOptions.info
                    this.view(this.editor.currentView)
                    break
                case !!showMoreButton: {
                    const button = showMoreButton as Element
                    const marginBox = button.closest(
                        ".margin-box.comment"
                    ) as HTMLElement | null | undefined
                    if (marginBox?.classList.contains("inactive")) {
                        const commentId = marginBox.dataset.id
                        if (commentId) {
                            this.editor.mod.comments.interactions.activateComment(
                                commentId
                            )
                            const update = this.updateDOM()
                            if (update) {
                                await update
                            }
                            const newButton = document.querySelector(
                                `#margin-box-${commentId} .show-more-less, #global-comments #margin-box-${commentId} .show-more-less`
                            )
                            if (newButton) {
                                this.toggleShowMore(newButton)
                                break
                            }
                        }
                    }
                    this.toggleShowMore(button)
                    break
                }
                case findTarget(event, ".margin-box.comment.inactive", el): {
                    const target = el.target as HTMLElement | null | undefined
                    const commentId = target?.dataset.id
                    if (!commentId) {
                        break
                    }
                    const comment =
                        this.editor.mod.comments.store.findComment(commentId)
                    if (!comment?.isGlobal) {
                        this.editor.mod.comments.interactions.deactivateSelectedChanges()
                    }
                    this.editor.mod.comments.interactions.activateComment(
                        commentId
                    )
                    this.scrollToGlobalComment(commentId)
                    break
                }
                case findTarget(event, ".margin-box.track.inactive", el): {
                    const target = el.target as HTMLElement | null | undefined
                    let boxNumber = 0
                    let seekItem: Element | null | undefined = target
                    while (seekItem?.previousElementSibling) {
                        boxNumber += 1
                        seekItem = seekItem.previousElementSibling
                    }
                    const box = this.marginBoxes[boxNumber]
                    switch (box.type) {
                        case "insertion":
                        case "deletion":
                        case "format_change":
                        case "block_change":
                            this.editor.mod.track.activateTrack(
                                box.view,
                                box.type,
                                box.pos as number
                            )
                            break
                        default:
                            break
                    }
                    break
                }
                default:
                    this.closeAllMenus()
                    this.closeAllLongComments()
                    break
            }
        })

        document.body.addEventListener(
            "change",
            evt => {
                const target = evt.target as HTMLInputElement | null
                switch (target?.id) {
                    case "margin-box-filter-comments-resolved":
                        this.filterOptions.commentsResolved = target.checked
                        this.view(this.editor.currentView)
                        break

                    case "margin-box-filter-comments-only-major":
                        this.filterOptions.commentsOnlyMajor = target.checked
                        this.view(this.editor.currentView)
                        break

                    case "margin-box-filter-info-help":
                        this.filterOptions.help = target.checked
                        this.view(this.editor.currentView)
                        break

                    case "margin-box-filter-info-warning":
                        this.filterOptions.warning = target.checked
                        this.view(this.editor.currentView)
                        break
                }
            },
            false
        )

        setTimeout(this.commentOptionsOnScroll, 100)
    }

    closeAllMenus(
        selector = ".marginbox-options-submenu.fw-open, .fw-marginbox-options.fw-open"
    ) {
        document.querySelectorAll(selector).forEach(el => {
            if (el.classList.contains("comment-answer-options")) {
                el.parentElement?.removeChild(el)
            } else {
                el.classList.remove("fw-open")
            }
        })
    }

    view(view: EditorView) {
        // Give up if the user is currently editing a comment.
        if (this.editor.mod.comments.interactions.isCurrentlyEditing()) {
            return false
        }
        this.editor.mod.comments.interactions.activateSelectedComment(view)
        return
    }

    updateDOM(): Promise<void> | false {
        // Handle the layout of the comments on the screen.
        // DOM write phase

        const marginBoxes: MarginBox[] = [],
            globalComments: import("./templates.js").CommentMarginBox[] = [],
            referrers: number[] = []
        const selectedChanges = getSelectedChanges(
            this.editor.currentView.state
        ) as SelectedChanges
        let fnIndex = 0,
            fnPosCount = 0,
            lastNodeTracks: NodeTrack[] = [],
            lastNode = this.editor.view.state.doc

        this.activeCommentStyle = ""
        this.editor.view.state.doc.descendants((node, pos) => {
            if (node.attrs.hidden) {
                return false
            }
            lastNodeTracks = this.getMarginBoxes(
                node,
                pos,
                pos,
                lastNode,
                lastNodeTracks,
                "main",
                marginBoxes,
                referrers,
                selectedChanges,
                this.editor.view.state.selection
            )
            lastNode = node

            if (node.type.name === "footnote") {
                let lastFnNode =
                        this.editor.mod.footnotes.fnEditor.view.state.doc,
                    lastFnNodeTracks: NodeTrack[] = []
                const footnote =
                    lastFnNode.childCount > fnIndex
                        ? lastFnNode.child(fnIndex)
                        : false
                if (!footnote) {
                    return
                }
                this.editor.mod.footnotes.fnEditor.view.state.doc.nodesBetween(
                    fnPosCount,
                    fnPosCount + footnote.nodeSize,
                    (fnNode: Node, fnPos: number) => {
                        if (fnPos < fnPosCount) {
                            return false
                        }
                        lastFnNodeTracks = this.getMarginBoxes(
                            fnNode,
                            fnPos,
                            pos,
                            lastFnNode,
                            lastFnNodeTracks,
                            "footnote",
                            marginBoxes,
                            referrers,
                            selectedChanges,
                            this.editor.view.state.selection
                        )
                        lastFnNode = fnNode
                        return
                    }
                )
                fnIndex++
                fnPosCount += footnote.nodeSize
            }
            return
        })

        // Add a comment that is currently under construction to the list.
        if (this.editor.mod.comments.store.commentDuringCreation) {
            const comment =
                this.editor.mod.comments.store.commentDuringCreation.comment
            if (comment.isGlobal) {
                globalComments.push({
                    type: "comment",
                    data: comment,
                    view: "main",
                    pos: this.editor.view.state.doc.content.size,
                    active: true
                })
                this.activeCommentStyle +=
                    ".active-comment, .active-comment .comment {background-color: #fffacf !important;}"
            } else {
                const deco = getCommentDuringCreationDecoration(
                    this.editor.view.state
                ) as {from: number} | null | undefined
                let pos: number | undefined, view: string | undefined
                if (deco) {
                    pos = deco.from
                    view = "main"
                } else {
                    const fnDeco = getCommentDuringCreationDecoration(
                        this.editor.mod.footnotes.fnEditor.view.state
                    ) as {from: number} | null | undefined
                    if (fnDeco) {
                        pos = this.fnPosToPos(fnDeco.from)
                        view = "footnote"
                    }
                }
                if (pos) {
                    let index = 0
                    // We need the position of the new comment in relation to the other
                    // comments in order to insert it in the right place
                    while (referrers.length > index && referrers[index] < pos) {
                        index++
                    }
                    marginBoxes.splice(index, 0, {
                        type: "comment",
                        data: comment,
                        view,
                        pos,
                        active: true
                    } as MarginBox)
                    referrers.splice(index, 0, pos)
                    this.activeCommentStyle +=
                        ".active-comment, .active-comment .comment {background-color: #fffacf !important;}"
                }
            }
        }

        // Add global comments at the bottom of the main column.
        Object.values(this.editor.mod.comments.store.comments).forEach(
            comment => {
                if (!comment.isGlobal) {
                    return
                }
                const active =
                    comment.id ===
                    this.editor.mod.comments.interactions.activeCommentId
                globalComments.push({
                    type: "comment",
                    data: comment,
                    view: "main",
                    pos: this.editor.view.state.doc.content.size,
                    active
                })
            }
        )

        const marginBoxesHTML = marginBoxesTemplate({
            marginBoxes,
            user: this.editor.user,
            docInfo: this.editor.docInfo,
            editComment: this.editor.mod.comments.interactions.editComment,
            activeCommentAnswerId:
                this.editor.mod.comments.interactions.activeCommentAnswerId,
            filterOptions: this.filterOptions
        })

        const globalCommentsHTML = globalCommentsTemplate({
            globalComments,
            user: this.editor.user,
            docInfo: this.editor.docInfo,
            editComment: this.editor.mod.comments.interactions.editComment,
            activeCommentAnswerId:
                this.editor.mod.comments.interactions.activeCommentAnswerId,
            filterOptions: this.filterOptions
        })

        this.marginBoxes = marginBoxes

        if (this.marginBoxesContainerString !== marginBoxesHTML) {
            const newMarginBoxesContainerObj = stringToObj(marginBoxesHTML)
            const diff = this.dd.diff(
                this.marginBoxesContainerObj,
                newMarginBoxesContainerObj
            )
            if (this.marginBoxesContainer) {
                this.dd.apply(this.marginBoxesContainer, diff)
            }
            this.marginBoxesContainerString = marginBoxesHTML
            this.marginBoxesContainerObj = newMarginBoxesContainerObj
        }

        if (this.globalCommentsContainerString !== globalCommentsHTML) {
            const newGlobalCommentsContainerObj =
                stringToObj(globalCommentsHTML)
            const diff = this.dd.diff(
                this.globalCommentsContainerObj,
                newGlobalCommentsContainerObj
            )
            if (this.globalCommentsContainer) {
                this.dd.apply(this.globalCommentsContainer, diff)
            }
            this.globalCommentsContainerString = globalCommentsHTML
            this.globalCommentsContainerObj = newGlobalCommentsContainerObj
        }

        if (this.activeCommentStyleElement) {
            this.activeCommentStyleElement.innerHTML = this.activeCommentStyle
        }

        const marginBoxFilterHTML = marginboxFilterTemplate({
            marginBoxes,
            filterOptions: this.filterOptions,
            pastParticipants: this.editor.mod.collab.pastParticipants
        })

        const marginBoxFilterElement =
            document.getElementById("margin-box-filter")

        if (!marginBoxFilterElement) {
            // User has navigated away already.
            return cancelPromise()
        }

        if (marginBoxFilterElement.innerHTML != marginBoxFilterHTML) {
            marginBoxFilterElement.innerHTML = marginBoxFilterHTML
        }

        return new Promise(resolve => {
            const fd = fastdom as unknown as {
                measure(cb: () => void): void
                mutate(cb: () => void): void
            }
            fd.measure(() => {
                // DOM read phase
                let marginBoxesPlacementStyle = ""
                if (
                    getComputedStyle(marginBoxFilterElement).position ===
                    "fixed"
                ) {
                    // We are in mobile/tablet mode. We don't need to place margin boxes.
                } else {
                    const marginBoxesDOM = document.querySelectorAll(
                        "#margin-box-container .margin-box"
                    )
                    if (
                        marginBoxesDOM.length !== referrers.length ||
                        !marginBoxesDOM.length
                    ) {
                        // Number of comment boxes and referrers differ.
                        // This isn't right. Abort.
                        resolve()
                        return
                    }
                    const bodyTop = document.body.getBoundingClientRect().top,
                        marginBoxPlacements: MarginBoxPlacement[] = Array.from(
                            marginBoxesDOM
                        ).map((mboxDOM, index) => {
                            const mboxDOMRect =
                                mboxDOM.getBoundingClientRect()
                            return {
                                height: mboxDOMRect.height,
                                refPos:
                                    this.editor.view.coordsAtPos(
                                        referrers[index]
                                    ).top - bodyTop
                            }
                        }),
                        firstActiveIndex = marginBoxes.findIndex(
                            mBox => mBox.active
                        ),
                        firstActiveMboxPlacement =
                            marginBoxPlacements[firstActiveIndex]

                    let activeIndex = firstActiveIndex,
                        currentPos = 0
                    while (activeIndex > -1) {
                        const mboxPlacement = marginBoxPlacements[activeIndex]
                        if (mboxPlacement.height === 0) {
                            mboxPlacement.pos = currentPos
                        } else if (mboxPlacement === firstActiveMboxPlacement) {
                            mboxPlacement.pos = mboxPlacement.refPos
                        } else {
                            mboxPlacement.pos = Math.min(
                                currentPos - 2 - mboxPlacement.height,
                                mboxPlacement.refPos
                            )
                        }
                        currentPos = mboxPlacement.pos as number
                        activeIndex--
                    }
                    if (firstActiveIndex > -1) {
                        currentPos =
                            (firstActiveMboxPlacement.pos as number) +
                            firstActiveMboxPlacement.height
                        activeIndex = firstActiveIndex + 1
                    } else {
                        activeIndex = 0
                    }

                    while (activeIndex < marginBoxPlacements.length) {
                        const mboxPlacement = marginBoxPlacements[activeIndex]
                        mboxPlacement.pos = Math.max(
                            currentPos + 2,
                            mboxPlacement.refPos
                        )
                        currentPos = (mboxPlacement.pos as number) + mboxPlacement.height
                        activeIndex++
                    }

                    const initialOffset = document.body.classList.contains(
                        "header-closed"
                    )
                        ? 72 + 90
                        : 225 + 90
                    const $head = this.editor.view.state.selection.$head
                    const selectionInTitle =
                        $head.depth > 0 &&
                        Array.from(
                            {length: $head.depth},
                            (_, index) => index + 1
                        ).some(depth => $head.node(depth).type.name === "title")
                    let totalOffset = 0

                    marginBoxesPlacementStyle = marginBoxPlacements
                        .map((mboxPlacement, index) => {
                            if (mboxPlacement.height === 0) {
                                return ""
                            }
                            const pos = (mboxPlacement.pos as number) - initialOffset
                            let css = ""
                            if (pos !== totalOffset) {
                                let topMargin = Math.trunc(
                                    pos - totalOffset
                                )
                                if (selectionInTitle) {
                                    topMargin = Math.max(topMargin, 0)
                                }
                                css += `#margin-box-container div.margin-box:nth-of-type(${index + 1}) {margin-top: ${topMargin}px;}\n`
                                totalOffset += topMargin
                            }
                            totalOffset += mboxPlacement.height
                            return css
                        })
                        .join("")
                    if (firstActiveIndex > -1) {
                        const topMenuHeight =
                            (this.editor.dom.querySelector("header") as HTMLElement | null)
                                ?.offsetHeight || 0
                        const refDistanceFromTop = this.editor.view.coordsAtPos(
                            referrers[firstActiveIndex]
                        ).top

                        if (
                            refDistanceFromTop - topMenuHeight < 0 ||
                            refDistanceFromTop > window.innerHeight - 30
                        ) {
                            const scrollTop =
                                refDistanceFromTop - (topMenuHeight + 90)
                            window.scrollBy({
                                left: 0,
                                top: scrollTop,
                                behavior: "smooth"
                            } as unknown as ScrollToOptions)
                        }
                    }
                }

                fd.mutate(() => {
                    //DOM write phase
                    if (
                        this.marginBoxesPlacementStyle !==
                        marginBoxesPlacementStyle
                    ) {
                        const placementStyleEl = document.getElementById(
                            "margin-box-placement-style"
                        )
                        if (placementStyleEl) {
                            placementStyleEl.innerHTML = marginBoxesPlacementStyle
                        }
                        this.marginBoxesPlacementStyle =
                            marginBoxesPlacementStyle
                    }
                    if (this.editor.mod.comments.store.commentDuringCreation) {
                        this.editor.mod.comments.store.commentDuringCreation.inDOM = true
                    }
                    resolve()
                })
            })
        })
    }

    fnPosToPos(fnPos: number) {
        const fnIndex = this.editor.mod.footnotes.fnEditor.view.state.doc
                .resolve(fnPos)
                .index(0),
            fnMarker = (
                getFootnoteMarkers(this.editor.view.state) as Array<{
                    from: number
                }>
            )[fnIndex]

        return fnMarker.from
    }

    getMarginBoxes(
        node: Node,
        pos: number,
        refPos: number,
        lastNode: Node,
        lastNodeTracks: NodeTrack[],
        view: string,
        marginBoxes: MarginBox[],
        referrers: number[],
        selectedChanges: SelectedChanges,
        selection: Selection
    ): NodeTrack[] {
        const selectionLike = selection as Selection & {
            node?: Node
        }
        if (node.attrs.help) {
            // Help/instruction margin boxes
            const helpBox = {
                type: "help",
                data: {
                    active: selectionLike.$anchor.node(1) === node ? true : false,
                    help: node.attrs.help
                }
            }
            marginBoxes.push(helpBox as MarginBox)
            referrers.push(refPos)
        }

        if (node.type.name === "cross_reference" && !node.attrs.title) {
            const warningBox = {
                type: "warning",
                data: {
                    active: selectionLike.node && selectionLike.node === node,
                    warning: gettext("A cross reference has lost its target.")
                }
            }
            marginBoxes.push(warningBox as MarginBox)
            referrers.push(refPos)
        }

        if (
            node.marks.find(
                mark =>
                    mark.type.name === "link" &&
                    mark.attrs.href.charAt(0) === "#" &&
                    !mark.attrs.title
            )
        ) {
            const linkMark = node.marks.find(mark => mark.type.name === "link")
            if (linkMark) {
                const warningBox = {
                    type: "warning",
                    data: {
                        active: linkMark.isInSet(selectionLike.$anchor.marks()),
                        warning: gettext("An internal link has lost its target.")
                    }
                }
                marginBoxes.push(warningBox as MarginBox)
                referrers.push(refPos)
            }
        }

        const commentIds =
            node.isInline || node.isLeaf
                ? this.editor.mod.comments.interactions.findCommentIds(node)
                : []

        const nodeTracks = node.attrs.track
            ? (
                  node.attrs.track as Array<{
                      type: string
                      user: number
                      username: string
                      date: number
                      before?: unknown
                  }>
              ).map(track => {
                  const nodeTrack: NodeTrack = {
                      type: track.type,
                      data: {
                          user: track.user,
                          username: track.username,
                          date: track.date
                      }
                  }
                  if (track.type === "block_change") {
                      nodeTrack.data.before = track.before
                  }
                  return nodeTrack
              })
            : node.marks
                  .filter(
                      mark =>
                          ["deletion", "format_change"].includes(
                              mark.type.name
                          ) ||
                          (mark.type.name === "insertion" &&
                              !mark.attrs.approved)
                  )
                  .map(mark => ({type: mark.type.name, data: mark.attrs}))

        // Filter out trackmarks already present in the last node (if it's an inline node).
        const tracks =
            node.isInline === lastNode.isInline
                ? nodeTracks.filter(
                      track =>
                          !lastNodeTracks.find(
                              lastTrack =>
                                  track.type === lastTrack.type &&
                                  track.data.user === lastTrack.data.user &&
                                  track.data.date === lastTrack.data.date &&
                                  (node.isInline || // block level changes almost always need new boxes
                                      (node.type.name === "paragraph" &&
                                          lastNode.type.name === "list_item" &&
                                          lastTrack.type === "insertion")) && // Don't show first paragraphs in list items.
                                  (["insertion", "deletion"].includes(
                                      track.type
                                  ) ||
                                      (track.type === "format_change" &&
                                          (track.data.before as string[]).length ===
                                              (lastTrack.data.before as string[])
                                                  .length &&
                                          (track.data.after as string[]).length ===
                                              (lastTrack.data.after as string[])
                                                  .length &&
                                          (track.data.before as string[]).every(
                                              markName =>
                                                  (lastTrack.data.before as string[]).includes(
                                                      markName
                                                  )
                                          ) &&
                                          (track.data.after as string[]).every(
                                              markName =>
                                                  (lastTrack.data.after as string[]).includes(
                                                      markName
                                                  )
                                          )) ||
                                      (track.type === "block_change" &&
                                          (track.data.before as {type: string}).type ===
                                              (lastTrack.data.before as {type: string})
                                                  .type &&
                                          (track.data.before as {attrs?: {level?: number}})
                                              .attrs?.level ===
                                              (lastTrack.data.before as {
                                                  attrs?: {level?: number}
                                              }).attrs?.level))
                          )
                  )
                : nodeTracks
        tracks.forEach(track => {
            marginBoxes.push(
                Object.assign(
                    {
                        node,
                        pos,
                        view,
                        active:
                            selectedChanges[track.type as keyof SelectedChanges] &&
                            selectedChanges[track.type as keyof SelectedChanges]!
                                .from === pos
                    },
                    track
                ) as MarginBox
            )
            referrers.push(refPos)
        })

        if (!commentIds.length && !tracks.length) {
            return nodeTracks
        }
        commentIds.forEach(commentId => {
            const comment =
                this.editor.mod.comments.store.findComment(commentId)
            if (
                !comment ||
                (this.filterOptions.commentsOnlyMajor && !comment.isMajor) ||
                (!this.filterOptions.commentsResolved && comment.resolved)
            ) {
                // We have no comment with this ID. Ignore the referrer.
                return
            }
            if (marginBoxes.find(marginBox => marginBox.data === comment)) {
                // comment already placed
                return
            }
            const active =
                comment.id ===
                this.editor.mod.comments.interactions.activeCommentId

            if (this.filterOptions.comments) {
                if (active) {
                    this.activeCommentStyle += `.comment[data-id="${comment.id}"], .comment[data-id="${comment.id}"] .comment {background-color: ${this.commentColors.active} !important;}`
                } else if (comment.isMajor) {
                    this.activeCommentStyle += `#paper-editable .comment[data-id="${comment.id}"] {background-color: ${this.commentColors.isMajor};}`
                } else {
                    this.activeCommentStyle += `#paper-editable .comment[data-id="${comment.id}"] {background-color: ${this.commentColors.marker};}`
                }
            }
            marginBoxes.push({
                type: "comment",
                data: comment,
                pos,
                view,
                active
            })
            referrers.push(refPos)
        })

        return nodeTracks
    }

    closeAllLongComments() {
        document.body.querySelectorAll(".comment-full").forEach(el => {
            const full = el as HTMLElement
            if (full.style.display !== "none") {
                full.style.display = "none"
                const truncated = full.parentElement?.querySelector(
                    ".comment-truncated"
                ) as HTMLElement | null
                if (truncated) {
                    truncated.style.display = ""
                }
                const showMoreButton = full
                    .closest(".comment-item")
                    ?.querySelector(".show-more-less")
                if (showMoreButton) {
                    showMoreButton.innerHTML = `${gettext("show more")}`
                }
            }
        })
    }

    positionMarginBoxOptions(
        marginBoxDialog: HTMLElement,
        showMarginboxOptionsBtn: Element
    ) {
        const btnTop = showMarginboxOptionsBtn.getBoundingClientRect().top,
            scrollTopOffset = window.pageYOffset,
            mBoxRight = showMarginboxOptionsBtn
                .closest(".comment-answer-container")
                ?.getBoundingClientRect().right || 0

        marginBoxDialog.style.top = `${btnTop + scrollTopOffset + 30}px`
        marginBoxDialog.style.left = `${mBoxRight - marginBoxDialog.getBoundingClientRect().width - 10}px`
    }

    scrollToGlobalComment(id: string) {
        const commentDOM = document.querySelector(
            `#global-comments #margin-box-${id}`
        )
        if (!commentDOM) {
            return
        }
        const topMenuHeight =
                (this.editor.dom.querySelector("header") as HTMLElement | null)
                    ?.offsetHeight || 0,
            rect = commentDOM.getBoundingClientRect()
        if (rect.top < topMenuHeight || rect.bottom > window.innerHeight - 30) {
            const scrollTop = rect.top - (topMenuHeight + 90)
            window.scrollBy({
                left: 0,
                top: scrollTop,
                behavior: "smooth"
            })
        }
    }

    commentOptionsOnScroll() {
        document
            .querySelectorAll(".comment-answer-container")
            .forEach(element => {
                element.addEventListener("scroll", () => {
                    const scrollTop = (element as HTMLElement).scrollTop
                    const marginBoxOption = Array.from(element.children).find(
                        node => node.matches(".show-marginbox-options")
                    )
                    if (scrollTop > 50) {
                        marginBoxOption?.classList.add("fw-hide")
                    } else {
                        marginBoxOption?.classList.remove("fw-hide")
                    }
                })
            })
    }

    toggleShowMore(element: Element) {
        const commentItem = element.closest(".comment-item")
        if (!commentItem) {
            return
        }
        const truncated = commentItem.querySelector(
            ".comment-truncated"
        ) as HTMLElement | null
        const full = commentItem.querySelector(
            ".comment-full"
        ) as HTMLElement | null
        if (!truncated || !full) {
            return
        }
        if (full.style.display === "none") {
            truncated.style.display = "none"
            full.style.display = ""
            ;(element as HTMLElement).innerText = `${gettext("show less")}`
        } else {
            truncated.style.display = ""
            full.style.display = "none"
            ;(element as HTMLElement).innerText = `${gettext("show more")}`
        }
    }

    setTrackStyle() {
        if (!this.filterOptions.track) {
            this.trackOptionsStyleElement!.innerHTML = `span.insertion, .selected-insertion, .selected-format_change, .selected-block_change {
                color: inherit !important;
                background-color: inherit !important;
            }
            span.deletion {
                display: none;
            }`
        } else if (this.filterOptions.trackAuthor) {
            this.trackOptionsStyleElement!.innerHTML = `span.insertion:not([data-user="${this.filterOptions.trackAuthor}"]),
            span.insertion:not([data-user="${this.filterOptions.trackAuthor}"]) .selected-insertion,
            .selected-format_change:not([data-user="${this.filterOptions.trackAuthor}"]),
            .selected-block_change:not([data-user="${this.filterOptions.trackAuthor}"]) {
                color: inherit !important;
                background-color: inherit !important;
            }
            span.deletion:not([data-user="${this.filterOptions.trackAuthor}"]) {
                display: none;
            }`
        } else {
            this.trackOptionsStyleElement!.innerHTML = ""
        }
    }
}
