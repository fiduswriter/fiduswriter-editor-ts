import {buildMenuItems} from "prosemirror-example-setup"
import {Dropdown, MenuItem, blockTypeItem} from "prosemirror-menu"
import {DOMSerializer, NodeSpec, NodeType, Schema} from "prosemirror-model"
import {schema} from "prosemirror-schema-basic"
import {
    addColumnAfter,
    addColumnBefore,
    addRowAfter,
    addRowBefore,
    deleteColumn,
    deleteRow,
    mergeCells,
    splitCell,
    toggleHeaderCell,
    toggleHeaderColumn,
    toggleHeaderRow
} from "prosemirror-tables"

import {docSchema} from "@fiduswriter/document/schema/document/index"

const doc = {
    content: "block+",
    toDOM(_node: any) {
        return ["div", 0]
    }
}

// from https://github.com/ProseMirror/prosemirror-tables/blob/master/src/util.js
const findTable = (state: any) => {
    const $head = state.selection.$head
    for (let d = $head.depth; d > 0; d--) {
        if ($head.node(d).type.spec.tableRole == "table") {
            return $head.node(d)
        }
    }
    return false
}

export const helpSchema = new Schema({
    nodes: schema.spec.nodes
        .remove("code_block")
        .remove("image")
        .remove("heading")
        .remove("horizontal_rule")
        .update("doc", doc as any),
    marks: schema.spec.marks.remove("code").update("link", {
        attrs: {
            href: {},
            title: {default: null}
        },
        inclusive: false,
        parseDOM: [
            {
                tag: "a[href]",
                getAttrs(dom: any) {
                    return {
                        href: dom.getAttribute("href"),
                        title: dom.getAttribute("title")
                    }
                }
            }
        ],
        toDOM(node: any) {
            return ["a", Object.assign({target: "_blank"}, node.attrs), 0]
        }
    })
})

export const helpMenuContent = buildMenuItems(helpSchema).fullMenu
helpMenuContent.splice(1, 1) // full menu minus drop downs

const helpSerializer = DOMSerializer.fromSchema(helpSchema)

export const serializeHelp = (content: any) => {
    const doc = {type: "doc", content},
        pmNode = helpSchema.nodeFromJSON(doc),
        dom = helpSerializer.serializeNode(pmNode)
    return (dom as HTMLElement).innerHTML
}

export const richtextPartSchema = new Schema({
    nodes: docSchema.spec.nodes.update("doc", {content: "richtext_part"}),
    marks: docSchema.spec.marks
})

export const richtextMenuContent = buildMenuItems(richtextPartSchema).fullMenu
for (let i = 1; i <= 6; i++) {
    const type = richtextPartSchema.nodes[`heading${i}`] as NodeType
    ;(richtextMenuContent[1][1] as any).content.push(
        blockTypeItem(type, {
            title: gettext("Change to heading ") + i,
            label: gettext("Heading level ") + i
        })
    )
}

const type = richtextPartSchema.nodes["table"] as NodeType
;(richtextMenuContent[1][0] as any).content.push(
    blockTypeItem(type, {
        title: gettext("Insert Table"),
        label: gettext("Table"),
        enable(state: any) {
            return !findTable(state)
        },
        run(state: any, dispatch: any) {
            const table = {
                type: "table",
                content: [
                    {type: "table_caption"},
                    {
                        type: "table_body",
                        content: [
                            {
                                type: "table_row",
                                content: [
                                    {
                                        type: "table_cell",
                                        content: [{type: "paragraph"}]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
            const schema = state.schema
            dispatch(
                state.tr.replaceSelectionWith(schema.nodeFromJSON(table)),
                false
            )
        }
    })
)

export const tablePartSchema = new Schema({
    nodes: docSchema.spec.nodes
        .update("doc", {content: "table_part"})
        .update("table_row", {
            content: "(table_cell | table_header)+",
            tableRole: "row",
            parseDOM: [{tag: "tr"}],
            toDOM() {
                return ["tr", 0]
            }
        }),
    marks: docSchema.spec.marks
})

export const tableMenuContent = buildMenuItems(tablePartSchema).fullMenu
for (let i = 1; i <= 6; i++) {
    const type = tablePartSchema.nodes[`heading${i}`] as NodeType
    ;(tableMenuContent[1][1] as any).content.push(
        blockTypeItem(type, {
            title: gettext("Change to heading ") + i,
            label: gettext("Heading level ") + i
        })
    )
}
function tableMenuItem(label: string, cmd: any) {
    return new MenuItem({label, select: cmd, run: cmd})
}
const tableMenu = [
    tableMenuItem(gettext("Insert column after"), addColumnAfter),
    tableMenuItem(gettext("Insert column before"), addColumnBefore),
    tableMenuItem(gettext("Insert column after"), addColumnAfter),
    tableMenuItem(gettext("Delete column"), deleteColumn),
    tableMenuItem(gettext("Insert row before"), addRowBefore),
    tableMenuItem(gettext("Insert row after"), addRowAfter),
    tableMenuItem(gettext("Delete row"), deleteRow),
    tableMenuItem(gettext("Split cell"), splitCell),
    tableMenuItem(gettext("Merge cells"), mergeCells),
    tableMenuItem(gettext("Toggle header column"), toggleHeaderColumn),
    tableMenuItem(gettext("Toggle header row"), toggleHeaderRow),
    tableMenuItem(gettext("Toggle header cells"), toggleHeaderCell),
    tableMenuItem(gettext("Delete table"), (state: any, dispatch: any) => {
        // Adjusted from https://github.com/ProseMirror/prosemirror-tables/blob/master/src/commands.js
        const $pos = state.selection.$anchor
        for (let d = $pos.depth; d > 0; d--) {
            const node = $pos.node(d)
            if (node.type.name == "table") {
                if (dispatch) {
                    dispatch(
                        state.tr
                            .delete($pos.before(d), $pos.after(d))
                            .scrollIntoView()
                    )
                }
                return true
            }
        }
        return false
    })
]
tableMenuContent.splice(2, 0, [
    new Dropdown(tableMenu, {label: gettext("Table")})
] as any)

richtextMenuContent.splice(2, 0, [
    new Dropdown(tableMenu, {label: gettext("Table")})
] as any)

export const headingPartSchema = new Schema({
    nodes: docSchema.spec.nodes
        .update("doc", {content: "heading_part"})
        .remove("horizontal_rule")
        .remove("paragraph")
        .remove("code_block"),
    marks: docSchema.spec.marks
})

export const headingMenuContent = buildMenuItems(headingPartSchema).fullMenu
for (let i = 1; i <= 6; i++) {
    const type = headingPartSchema.nodes[`heading${i}`] as NodeType
    ;(headingMenuContent[1][1] as any).content.push(
        blockTypeItem(type, {
            title: gettext("Change to heading ") + i,
            label: gettext("Heading level ") + i
        })
    )
}

export const tagsPartSchema = new Schema({
    nodes: {
        doc: {content: "tags_part"},
        tags_part: docSchema.spec.nodes.get("tags_part") as NodeSpec,
        tag: docSchema.spec.nodes.get("tag") as NodeSpec,
        text: docSchema.spec.nodes.get("text") as NodeSpec
    },
    marks: docSchema.spec.marks
})

export const contributorsPartSchema = new Schema({
    nodes: {
        doc: {content: "contributors_part"},
        contributors_part: docSchema.spec.nodes.get(
            "contributors_part"
        ) as NodeSpec,
        contributor: docSchema.spec.nodes.get("contributor") as NodeSpec,
        text: docSchema.spec.nodes.get("text") as NodeSpec
    },
    marks: docSchema.spec.marks
})
