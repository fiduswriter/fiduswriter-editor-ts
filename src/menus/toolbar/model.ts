import {toggleMark, wrapIn} from "prosemirror-commands"
import {redo, redoDepth, undo, undoDepth} from "prosemirror-history"
import {wrapInList} from "prosemirror-schema-list"
import type {Mark, Node} from "prosemirror-model"
import type {Selection, Transaction} from "prosemirror-state"

import {COMMENT_ONLY_ROLES, READ_ONLY_ROLES} from "../../index.js"
import {
    CitationDialog,
    FigureDialog,
    LinkDialog,
    MathDialog,
    TableDialog
} from "../../dialogs/index.js"
import {setBlockType} from "../../keymap.js"
import {checkProtectedInSelection} from "../../state_plugins/document_template.js"
import {
    getInlineReferenceState,
    setInlineReferenceState
} from "../../state_plugins/inline_reference/index.js"
import type {Editor} from "../../types.js"

interface BlockLabels {
    [key: string]: string
}

const BLOCK_LABELS: BlockLabels = {
    paragraph: gettext("Normal Text"),
    heading1: gettext("1st Heading"),
    heading2: gettext("2nd Heading"),
    heading3: gettext("3rd Heading"),
    heading4: gettext("4th Heading"),
    heading5: gettext("5th Heading"),
    heading6: gettext("6th Heading"),
    code_block: gettext("Code"),
    figure: gettext("Figure")
}

/** Minimal shape of the headerbar model used by the toolbar toggle button. */
interface HeaderbarModelLike {
    open: boolean
}

/** Minimal shape of the headerbar view used to refresh the header menu. */
interface HeaderbarViewLike {
    update(): void
}

/**
 * ProseMirror's base Selection type does not expose the instance `jsonID` and
 * `node` properties that concrete subclasses such as NodeSelection provide.
 * The toolbar model only reads these values, so we cast through this small
 * local interface rather than using `any`.
 */
interface SelectionExtras {
    jsonID: string
    node?: Node
}

function currentSelection(editor: Editor): Selection & SelectionExtras {
    return editor.currentView.state.selection as Selection & SelectionExtras
}

// from https://github.com/ProseMirror/prosemirror-tables/blob/master/src/util.js
const findTable = (state: {selection: {$head: {depth: number; node(d: number): Node}}}) => {
    const $head = state.selection.$head
    for (let d = $head.depth; d > 0; d--) {
        if (($head.node(d).type.spec as {tableRole?: string}).tableRole == "table") {
            return $head.node(d)
        }
    }
    return null
}

function elementAvailable(editor: Editor, elementName: string): boolean {
    let elementInDocParts = false
    editor.view.state.doc.forEach(docPart => {
        if (
            (docPart.attrs.elements as string[] | undefined)?.includes(elementName)
        ) {
            elementInDocParts = true
        }
    })
    const partElements =
        editor.view.state.selection.$anchor.node(1)?.attrs.elements ||
        (editor.view.state.selection.$anchor.node(1)?.type.spec.attrs
            ?.elements as {default?: string[]})?.default
    return (
        partElements?.includes(elementName) ||
        (editor.view.state.doc.attrs.footnote_elements as string[]).includes(elementName) ||
        elementInDocParts
    )
}

export function elementDisabled(
    editor: Editor,
    elementName: string
): boolean {
    if (editor.currentView === editor.view) {
        // main editor
        const anchorDocPart =
                editor.currentView.state.selection.$anchor.node(1),
            headDocPart = editor.currentView.state.selection.$head.node(1)
        const partElements =
            anchorDocPart?.attrs.elements ||
            (anchorDocPart?.type.spec.attrs?.elements as {default?: string[]})?.default

        return (
            !anchorDocPart ||
            headDocPart !== anchorDocPart ||
            !partElements?.includes(elementName) ||
            checkProtectedInSelection(editor.view.state)
        )
    } else {
        // footnote editor
        const anchorFootnote =
                editor.currentView.state.selection.$anchor.node(1),
            headFootnote = editor.currentView.state.selection.$head.node(1)

        return (
            !anchorFootnote ||
            headFootnote !== anchorFootnote ||
            !(editor.view.state.doc.attrs.footnote_elements as string[]).includes(elementName)
        )
    }
}

function markAvailable(editor: Editor, markName: string): boolean {
    let markInDocParts = false
    editor.view.state.doc.forEach(docPart => {
        if ((docPart.attrs.marks as string[] | undefined)?.includes(markName)) {
            markInDocParts = true
        }
    })
    return (
        (editor.view.state.doc.attrs.footnote_marks as string[]).includes(markName) ||
        markInDocParts
    )
}

function markDisabled(editor: Editor, markName: string): boolean {
    if (editor.currentView === editor.view) {
        // main editor
        const anchorDocPart =
                editor.currentView.state.selection.$anchor.node(1),
            headDocPart = editor.currentView.state.selection.$head.node(1)

        return (
            !anchorDocPart ||
            headDocPart !== anchorDocPart ||
            !(anchorDocPart.attrs.marks as string[] | undefined)?.includes(markName) ||
            checkProtectedInSelection(editor.view.state)
        )
    } else {
        // footnote editor
        const anchorFootnote =
                editor.currentView.state.selection.$anchor.node(1),
            headFootnote = editor.currentView.state.selection.$head.node(1)

        return (
            !anchorFootnote ||
            headFootnote !== anchorFootnote ||
            !(editor.view.state.doc.attrs.footnote_marks as string[]).includes(markName)
        )
    }
}

export const toolbarModel = () => ({
    openMore: false, // whether 'more' menu is opened.
    content: [
        {
            type: "button",
            title: gettext("Open/close header menu"),
            icon: (editor: Editor) => {
                if ((editor.menu.headerbarModel as HeaderbarModelLike).open) {
                    return "angle-double-up"
                } else {
                    return "angle-double-down"
                }
            },
            action: (editor: Editor) => {
                ;(editor.menu.headerbarModel as HeaderbarModelLike).open =
                    !(editor.menu.headerbarModel as HeaderbarModelLike).open
                if (editor.menu.headerView) {
                    ;(editor.menu.headerView as HeaderbarViewLike).update()
                }
            },
            class: (editor: Editor) => {
                if ((editor.menu.headerbarModel as HeaderbarModelLike).open) {
                    return "no-border"
                } else {
                    return "no-border header-closed"
                }
            },
            order: 0
        },
        {
            type: "info",
            show: (editor: Editor) => {
                let title = ""
                const selection = currentSelection(editor)
                if (editor.currentView !== editor.view) {
                    return gettext("Footnote")
                } else if (
                    editor.currentView.state.selection.$anchor.node(1) &&
                    editor.currentView.state.selection.$anchor.node(1) ===
                        editor.currentView.state.selection.$head.node(1)
                ) {
                    title =
                        editor.currentView.state.selection.$anchor.node(1).attrs
                            .title || gettext("Title")
                    return title.length > 20
                        ? title.slice(0, 20) + "..."
                        : title
                } else if (
                    editor.currentView.state.selection.$anchor.depth === 0 &&
                    editor.currentView.state.selection.from ===
                        editor.currentView.state.selection.to
                ) {
                    title =
                        editor.currentView.state.selection.$anchor.nodeAfter
                            ?.attrs.title ?? ""
                    return title.length > 20
                        ? title.slice(0, 20) + "..."
                        : title
                } else if (
                    selection.jsonID === "node" &&
                    selection.node?.isBlock &&
                    selection.node.attrs.title
                ) {
                    title = selection.node.attrs.title
                    return title.length > 20
                        ? title.slice(0, 20) + "..."
                        : title
                } else {
                    return ""
                }
            },
            order: 1
        },
        {
            type: "menu",
            show: (editor: Editor) => {
                const selection = currentSelection(editor)
                if (
                    editor.currentView.state.selection.$anchor.node(1) &&
                    !editor.view.state.selection.$anchor.node(1).attrs.elements &&
                    !(editor.view.state.schema.nodes.richtext_part.spec
                        .attrs as Record<string, {default?: unknown}>).elements
                        ?.default
                ) {
                    return ""
                }
                if (
                    selection.jsonID === "node" &&
                    selection.node?.isBlock
                ) {
                    const selectedNode = selection.node
                    return BLOCK_LABELS[selectedNode.type.name]
                        ? BLOCK_LABELS[selectedNode.type.name]
                        : ""
                }
                const startElement =
                        editor.currentView.state.selection.$anchor.parent,
                    endElement = editor.currentView.state.selection.$head.parent
                if (!startElement || !endElement) {
                    return ""
                } else if (startElement === endElement) {
                    const blockNodeType = startElement.type.name
                    return BLOCK_LABELS[blockNodeType]
                        ? BLOCK_LABELS[blockNodeType]
                        : ""
                } else {
                    let blockNodeType: string | boolean = true
                    editor.currentView.state.doc.nodesBetween(
                        editor.currentView.state.selection.from,
                        editor.currentView.state.selection.to,
                        node => {
                            if (node.isTextblock) {
                                const nextBlockNodeType = node.type.name
                                if (blockNodeType === true) {
                                    blockNodeType = nextBlockNodeType
                                }
                                if (blockNodeType !== nextBlockNodeType) {
                                    blockNodeType = false
                                }
                            }
                        }
                    )

                    if (blockNodeType && typeof blockNodeType === "string") {
                        return BLOCK_LABELS[blockNodeType]
                            ? BLOCK_LABELS[blockNodeType]
                            : ""
                    } else {
                        return ""
                    }
                }
            },
            disabled: (editor: Editor) =>
                READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                !editor.currentView.state.selection.$anchor.node(1) ||
                !(editor.currentView.state.selection.$anchor.node(1).attrs
                    .elements ||
                  (editor.currentView.state.schema.nodes.richtext_part.spec
                      .attrs as Record<string, {default?: unknown}>).elements
                      ?.default) ||
                (currentSelection(editor).jsonID === "node" &&
                    currentSelection(editor).node?.isBlock &&
                    !currentSelection(editor).node?.isTextblock) ||
                currentSelection(editor).jsonID === "gapcursor",
            content: [
                {
                    title: BLOCK_LABELS["paragraph"],
                    action: (editor: Editor) => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.paragraph!)(
                            view.state,
                            view.dispatch
                        )
                    },
                    available: (editor: Editor) => elementAvailable(editor, "paragraph"),
                    disabled: (editor: Editor) => elementDisabled(editor, "paragraph"),
                    order: 0
                },
                {
                    title: BLOCK_LABELS["heading1"],
                    action: (editor: Editor) => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading1!)(
                            view.state,
                            view.dispatch
                        )
                    },
                    available: (editor: Editor) => elementAvailable(editor, "heading1"),
                    disabled: (editor: Editor) => elementDisabled(editor, "heading1"),
                    order: 1
                },
                {
                    title: BLOCK_LABELS["heading2"],
                    action: (editor: Editor) => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading2!)(
                            view.state,
                            view.dispatch
                        )
                    },
                    available: (editor: Editor) => elementAvailable(editor, "heading2"),
                    disabled: (editor: Editor) => elementDisabled(editor, "heading2"),
                    order: 2
                },
                {
                    title: BLOCK_LABELS["heading3"],
                    action: (editor: Editor) => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading3!)(
                            view.state,
                            view.dispatch
                        )
                    },
                    available: (editor: Editor) => elementAvailable(editor, "heading3"),
                    disabled: (editor: Editor) => elementDisabled(editor, "heading3"),
                    order: 3
                },
                {
                    title: BLOCK_LABELS["heading4"],
                    action: (editor: Editor) => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading4!)(
                            view.state,
                            view.dispatch
                        )
                    },
                    available: (editor: Editor) => elementAvailable(editor, "heading4"),
                    disabled: (editor: Editor) => elementDisabled(editor, "heading4"),
                    order: 4
                },
                {
                    title: BLOCK_LABELS["heading5"],
                    action: (editor: Editor) => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading5!)(
                            view.state,
                            view.dispatch
                        )
                    },
                    available: (editor: Editor) => elementAvailable(editor, "heading5"),
                    disabled: (editor: Editor) => elementDisabled(editor, "heading5"),
                    order: 5
                },
                {
                    title: BLOCK_LABELS["heading6"],
                    action: (editor: Editor) => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading6!)(
                            view.state,
                            view.dispatch
                        )
                    },
                    available: (editor: Editor) => elementAvailable(editor, "heading6"),
                    disabled: (editor: Editor) => elementDisabled(editor, "heading6"),
                    order: 6
                },
                {
                    title: BLOCK_LABELS["code_block"],
                    action: (editor: Editor) => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.code_block!)(
                            view.state,
                            view.dispatch
                        )
                    },
                    available: (editor: Editor) => elementAvailable(editor, "code_block"),
                    disabled: (editor: Editor) => elementDisabled(editor, "code_block"),
                    order: 7
                }
            ],
            order: 2
        },
        {
            type: "button",
            title: gettext("Strong"),
            icon: "bold",
            action: (editor: Editor) => {
                const mark = editor.currentView.state.schema.marks["strong"]!
                const command = toggleMark(mark)
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            available: (editor: Editor) => markAvailable(editor, "strong"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    currentSelection(editor).jsonID === "gapcursor" ||
                    markDisabled(editor, "strong")
                ) {
                    return true
                }
                return false
            },
            selected: (editor: Editor) => {
                const storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks?.some((mark: Mark) => mark.type.name === "strong") ||
                    editor.currentView.state.selection.$head
                        .marks()
                        .some((mark: Mark) => mark.type.name === "strong")
                ) {
                    return true
                } else {
                    return false
                }
            },
            order: 3
        },
        {
            type: "button",
            title: gettext("Emphasis"),
            icon: "italic",
            action: (editor: Editor) => {
                const mark = editor.currentView.state.schema.marks["em"]!
                const command = toggleMark(mark)
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            available: (editor: Editor) => markAvailable(editor, "em"),
            disabled: (editor: Editor) =>
                READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                currentSelection(editor).jsonID === "gapcursor" ||
                markDisabled(editor, "em"),
            selected: (editor: Editor) => {
                const storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks?.some((mark: Mark) => mark.type.name === "em") ||
                    editor.currentView.state.selection.$head
                        .marks()
                        .some((mark: Mark) => mark.type.name === "em")
                ) {
                    return true
                } else {
                    return false
                }
            },
            order: 4
        },
        {
            type: "button",
            title: gettext("Underline"),
            icon: "underline",
            action: (editor: Editor) => {
                const mark = editor.currentView.state.schema.marks["underline"]!
                const command = toggleMark(mark)
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            available: (editor: Editor) => markAvailable(editor, "underline"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    currentSelection(editor).jsonID === "gapcursor" ||
                    markDisabled(editor, "underline")
                ) {
                    return true
                }
                return false
            },
            selected: (editor: Editor) => {
                const storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks?.some((mark: Mark) => mark.type.name === "underline") ||
                    editor.currentView.state.selection.$head
                        .marks()
                        .some((mark: Mark) => mark.type.name === "underline")
                ) {
                    return true
                } else {
                    return false
                }
            },
            order: 5
        },
        {
            type: "button",
            title: gettext("Superscript"),
            icon: "superscript",
            action: (editor: Editor) => {
                const mark = editor.currentView.state.schema.marks["sup"]!
                const command = toggleMark(mark)
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            available: (editor: Editor) => markAvailable(editor, "sup"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    currentSelection(editor).jsonID === "gapcursor" ||
                    markDisabled(editor, "sup")
                ) {
                    return true
                }
                return false
            },
            selected: (editor: Editor) => {
                const storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks?.some((mark: Mark) => mark.type.name === "sup") ||
                    editor.currentView.state.selection.$head
                        .marks()
                        .some((mark: Mark) => mark.type.name === "sup")
                ) {
                    return true
                } else {
                    return false
                }
            },
            order: 6
        },
        {
            type: "button",
            title: gettext("Subscript"),
            icon: "subscript",
            action: (editor: Editor) => {
                const mark = editor.currentView.state.schema.marks["sub"]!
                const command = toggleMark(mark)
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            available: (editor: Editor) => markAvailable(editor, "sub"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    currentSelection(editor).jsonID === "gapcursor" ||
                    markDisabled(editor, "sub")
                ) {
                    return true
                }
                return false
            },
            selected: (editor: Editor) => {
                const storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks?.some((mark: Mark) => mark.type.name === "sub") ||
                    editor.currentView.state.selection.$head
                        .marks()
                        .some((mark: Mark) => mark.type.name === "sub")
                ) {
                    return true
                } else {
                    return false
                }
            },
            order: 7
        },
        {
            type: "button",
            title: gettext("Code"),
            icon: "code",
            action: (editor: Editor) => {
                const mark = editor.currentView.state.schema.marks["code"]!
                const command = toggleMark(mark)
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            available: (editor: Editor) => markAvailable(editor, "code"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    currentSelection(editor).jsonID === "gapcursor" ||
                    markDisabled(editor, "code")
                ) {
                    return true
                }
                return false
            },
            selected: (editor: Editor) => {
                const storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks?.some((mark: Mark) => mark.type.name === "code") ||
                    editor.currentView.state.selection.$head
                        .marks()
                        .some((mark: Mark) => mark.type.name === "code")
                ) {
                    return true
                } else {
                    return false
                }
            },
            order: 8
        },
        {
            type: "button",
            title: gettext("Numbered list"),
            icon: "list-ol",
            action: (editor: Editor) => {
                const node =
                    editor.currentView.state.schema.nodes["ordered_list"]!
                const command = wrapInList(node)
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            available: (editor: Editor) => elementAvailable(editor, "ordered_list"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    elementDisabled(editor, "ordered_list")
                ) {
                    return true
                }
                return false
            },
            selected: (editor: Editor) => {
                const depth =
                    editor.currentView.state.selection.$head.sharedDepth(
                        editor.currentView.state.selection.anchor
                    )
                const nodeType =
                    editor.currentView.state.schema.nodes["ordered_list"]!
                for (let i = 0; i < depth; i++) {
                    const node =
                        editor.currentView.state.selection.$head.node(i)
                    if (node.type === nodeType) {
                        return true
                    }
                }
                return false
            },
            order: 9
        },
        {
            type: "button",
            title: gettext("Bullet list"),
            icon: "list-ul",
            action: (editor: Editor) => {
                const node =
                    editor.currentView.state.schema.nodes["bullet_list"]!
                const command = wrapInList(node)
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            available: (editor: Editor) => elementAvailable(editor, "bullet_list"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    elementDisabled(editor, "bullet_list")
                ) {
                    return true
                }
                return false
            },
            selected: (editor: Editor) => {
                const depth =
                    editor.currentView.state.selection.$head.sharedDepth(
                        editor.currentView.state.selection.anchor
                    )
                const nodeType =
                    editor.currentView.state.schema.nodes["bullet_list"]!
                for (let i = 0; i < depth; i++) {
                    const node =
                        editor.currentView.state.selection.$head.node(i)
                    if (node.type === nodeType) {
                        return true
                    }
                }
                return false
            },
            order: 10
        },
        {
            type: "button",
            title: gettext("Blockquote"),
            icon: "quote-right",
            action: (editor: Editor) => {
                const node = editor.currentView.state.schema.nodes["blockquote"]!
                const command = wrapIn(node)
                command(editor.currentView.state, tr =>
                    editor.currentView.dispatch(tr)
                )
            },
            available: (editor: Editor) => elementAvailable(editor, "blockquote"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    elementDisabled(editor, "blockquote")
                ) {
                    return true
                }
                return false
            },
            selected: (editor: Editor) => {
                const depth =
                    editor.currentView.state.selection.$head.sharedDepth(
                        editor.currentView.state.selection.anchor
                    )
                const nodeType =
                    editor.currentView.state.schema.nodes["blockquote"]!
                for (let i = 0; i < depth; i++) {
                    const node =
                        editor.currentView.state.selection.$head.node(i)
                    if (node.type === nodeType) {
                        return true
                    }
                }
                return false
            },
            order: 11
        },
        {
            id: "link",
            type: "button",
            title: gettext("Link"),
            icon: "link",
            action: (editor: Editor) => {
                const dialog = new LinkDialog(editor)
                dialog.init()
            },
            available: (editor: Editor) => markAvailable(editor, "link"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    (markDisabled(editor, "link") &&
                        elementDisabled(editor, "cross_reference"))
                ) {
                    return true
                }
                return false
            },
            selected: (editor: Editor) =>
                editor.currentView.state.selection.$head
                    .marks()
                    .some((mark: Mark) => mark.type.name === "link"),
            order: 12
        },
        {
            type: "button",
            title: gettext("Footnote"),
            icon: "asterisk",
            action: (editor: Editor) => {
                const node = editor.view.state.schema.nodes["footnote"]!
                const tr = editor.view.state.tr.replaceSelectionWith(
                    node.createAndFill()!,
                    false
                )
                editor.view.dispatch(tr)
                return false
            },
            available: (editor: Editor) => elementAvailable(editor, "footnote"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    editor.view !== editor.currentView || // we don't allow footnotes in footnotes
                    elementDisabled(editor, "footnote")
                ) {
                    return true
                }
                return false
            },
            order: 13
        },
        {
            type: "button",
            title: gettext("Cite"),
            icon: "book",
            action: (editor: Editor) => {
                const inlineState = getInlineReferenceState(
                    editor.currentView.state
                ) as {active?: boolean; isEdit?: boolean} | undefined
                if (inlineState?.active && inlineState.isEdit) {
                    editor.currentView.dispatch(
                        setInlineReferenceState(editor.currentView.state.tr, {
                            action: "openDialog"
                        } as Partial<{
                            active?: boolean
                            isEdit?: boolean
                        }>) as Transaction
                    )
                }
                const dialog = new CitationDialog(editor)
                dialog.init()
                return false
            },
            available: (editor: Editor) => elementAvailable(editor, "citation"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    elementDisabled(editor, "citation") ||
                    !["text", "node"].includes(
                        currentSelection(editor).jsonID
                    ) ||
                    (currentSelection(editor).jsonID === "node" &&
                        currentSelection(editor).node?.type.name !==
                            "citation")
                ) {
                    return true
                }
                return false
            },
            order: 14
        },
        {
            type: "button",
            title: gettext("Horizontal line"),
            icon: "minus",
            action: (editor: Editor) => {
                const view = editor.currentView,
                    state = view.state
                view.dispatch(
                    state.tr.replaceSelectionWith(
                        state.schema.node("horizontal_rule")
                    )
                )
            },
            available: (editor: Editor) => elementAvailable(editor, "horizontal_rule"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    elementDisabled(editor, "horizontal_rule")
                ) {
                    return true
                }
                return false
            },
            order: 15
        },
        {
            type: "button",
            title: gettext("Math"),
            icon: "percent",
            action: (editor: Editor) => {
                const dialog = new MathDialog(editor)
                dialog.init()
            },
            available: (editor: Editor) => elementAvailable(editor, "equation"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    elementDisabled(editor, "equation") ||
                    !["text", "node"].includes(
                        currentSelection(editor).jsonID
                    ) ||
                    (currentSelection(editor).jsonID === "node" &&
                        currentSelection(editor).node?.type.name !==
                            "equation")
                ) {
                    return true
                }
                return false
            },
            order: 16
        },
        {
            type: "button",
            title: gettext("Figure"),
            icon: "image",
            action: (editor: Editor) => {
                const dialog = new FigureDialog(editor)
                dialog.init()
                return false
            },
            available: (editor: Editor) => elementAvailable(editor, "figure"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    elementDisabled(editor, "figure")
                ) {
                    return true
                }
                return false
            },
            order: 17
        },
        {
            type: "button",
            title: gettext("Table"),
            tooltip: gettext("Insert a table into the document."),
            icon: "table",
            action: (editor: Editor) => {
                const dialog = new TableDialog(editor)
                dialog.init()
                return false
            },
            available: (editor: Editor) => elementAvailable(editor, "table"),
            disabled: (editor: Editor) => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights as string) ||
                    elementDisabled(editor, "table") ||
                    findTable(editor.currentView.state)
                ) {
                    return true
                }
                return false
            },
            order: 15
        },
        {
            type: "button",
            title: gettext("Undo"),
            icon: "undo",
            action: (editor: Editor) =>
                undo(editor.currentView.state, tr =>
                    editor.currentView.dispatch(
                        tr.setMeta("inputType", "historyUndo")
                    )
                ),
            disabled: (editor: Editor) => undoDepth(editor.currentView.state) === 0,
            order: 16
        },
        {
            type: "button",
            title: gettext("Redo"),
            icon: "redo",
            action: (editor: Editor) =>
                redo(editor.currentView.state, tr =>
                    editor.currentView.dispatch(
                        tr.setMeta("inputType", "historyRedo")
                    )
                ),
            disabled: (editor: Editor) => redoDepth(editor.currentView.state) === 0,
            order: 17
        }
    ]
})
