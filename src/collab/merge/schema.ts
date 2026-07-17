import {Schema} from "prosemirror-model"
import type {Node, NodeSpec, MarkSpec, Mark} from "prosemirror-model"

export function parseDiff(str: string | undefined): unknown[] {
    if (!str) {
        return []
    }
    let tracks
    try {
        tracks = JSON.parse(str)
    } catch (_error) {
        return []
    }
    if (!Array.isArray(tracks)) {
        return []
    }
    return tracks
}

export const createDiffSchema = (docSchema: Schema): Schema => {
    let specNodes = docSchema.spec.nodes

    specNodes.forEach((nodeTypeName: string) => {
        const nodeSpec = specNodes.get(nodeTypeName) as NodeSpec | undefined
        if (!nodeSpec || nodeSpec.group !== "block") {
            return
        }
        const attrs = nodeSpec.attrs
        specNodes = specNodes.update(
            nodeTypeName,
            Object.assign({}, nodeSpec, {
                attrs: Object.assign({diffdata: {default: []}}, attrs),
                toDOM: (node: Node) => {
                    let dom = nodeSpec.toDOM?.(node) as [
                        string,
                        Record<string, unknown>,
                        number
                    ]
                    if (node.attrs.diffdata && node.attrs.diffdata.length) {
                        if (dom[1].class) {
                            dom[1].class =
                                dom[1].class +
                                " " +
                                (node.attrs.diffdata[0] as {type: string}).type
                        } else {
                            dom[1]["class"] = (node.attrs.diffdata[0] as {
                                type: string
                            }).type
                        }
                        dom = [
                            dom[0],
                            Object.assign(
                                {
                                    "data-diffdata": JSON.stringify(
                                        node.attrs.diffdata
                                    )
                                },
                                dom[1]
                            ),
                            dom[2]
                        ]
                    }
                    return dom
                },
                parseDOM: nodeSpec.parseDOM?.map(tag => ({
                    tag: tag.tag,
                    getAttrs: (dom: HTMLElement) => {
                        const attrs = tag.getAttrs
                            ? tag.getAttrs(dom)
                            : {}
                        return Object.assign(
                            {
                                diffdata: parseDiff(dom.dataset.diffdata)
                            },
                            attrs
                        )
                    }
                }))
            }) as NodeSpec
        )
    })

    const diffdata: MarkSpec = {
        attrs: {
            diff: {
                default: ""
            },
            steps: {
                default: []
            },
            from: {
                default: ""
            },
            to: {
                default: ""
            },
            markOnly: {
                default: false
            }
        },
        inclusive: false,
        parseDOM: [
            {
                tag: "span.diff",
                getAttrs(dom: HTMLElement) {
                    return {
                        diff: dom.dataset.diff,
                        steps: dom.dataset.steps
                    }
                }
            }
        ],
        toDOM(mark: Mark) {
            return [
                "span",
                {
                    class: `diff ${mark.attrs.diff}`,
                    "data-diff": mark.attrs.diff,
                    "data-steps": mark.attrs.steps,
                    "data-from": mark.attrs.from,
                    "data-to": mark.attrs.to,
                    "data-markOnly": mark.attrs.markOnly
                }
            ]
        }
    }

    const spec = {
        nodes: specNodes,
        marks: docSchema.spec.marks.addToEnd("diffdata", diffdata)
    }

    // Update link mark toDom to render a span instead of anchor tag
    // Since editable false PM Editor treats anchor tag as a normal a tag
    // and redirects
    const linkMarkSpec = spec.marks.get("link")
    if (linkMarkSpec) {
        spec.marks = spec.marks.update(
            "link",
            Object.assign({}, linkMarkSpec, {
                toDOM: (mark: Mark, inline: boolean) => {
                    const dom = linkMarkSpec.toDOM!(mark, inline) as [
                        string,
                        Record<string, unknown>,
                        number
                    ]
                    dom[0] = "span"
                    return dom
                }
            })
        )
    }

    return new Schema(spec)
}
