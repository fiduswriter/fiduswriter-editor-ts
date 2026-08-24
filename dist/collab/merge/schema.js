import { Schema } from "prosemirror-model";
export function parseDiff(str) {
    if (!str) {
        return [];
    }
    let tracks;
    try {
        tracks = JSON.parse(str);
    }
    catch (_error) {
        return [];
    }
    if (!Array.isArray(tracks)) {
        return [];
    }
    return tracks;
}
export const createDiffSchema = (docSchema) => {
    let specNodes = docSchema.spec.nodes;
    specNodes.forEach((nodeTypeName) => {
        const nodeSpec = specNodes.get(nodeTypeName);
        if (!nodeSpec || nodeSpec.group !== "block") {
            return;
        }
        const attrs = nodeSpec.attrs;
        specNodes = specNodes.update(nodeTypeName, Object.assign({}, nodeSpec, {
            attrs: Object.assign({ diffdata: { default: [] } }, attrs),
            toDOM: (node) => {
                let dom = nodeSpec.toDOM?.(node);
                if (node.attrs.diffdata && node.attrs.diffdata.length) {
                    if (dom[1].class) {
                        dom[1].class =
                            dom[1].class +
                                " " +
                                node.attrs.diffdata[0].type;
                    }
                    else {
                        dom[1]["class"] = node.attrs.diffdata[0].type;
                    }
                    dom = [
                        dom[0],
                        Object.assign({
                            "data-diffdata": JSON.stringify(node.attrs.diffdata)
                        }, dom[1]),
                        dom[2]
                    ];
                }
                return dom;
            },
            parseDOM: nodeSpec.parseDOM?.map(tag => ({
                tag: tag.tag,
                getAttrs: (dom) => {
                    const attrs = tag.getAttrs
                        ? tag.getAttrs(dom)
                        : {};
                    return Object.assign({
                        diffdata: parseDiff(dom.dataset.diffdata)
                    }, attrs);
                }
            }))
        }));
    });
    const diffdata = {
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
                getAttrs(dom) {
                    return {
                        diff: dom.dataset.diff,
                        steps: dom.dataset.steps
                    };
                }
            }
        ],
        toDOM(mark) {
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
            ];
        }
    };
    const spec = {
        nodes: specNodes,
        marks: docSchema.spec.marks.addToEnd("diffdata", diffdata)
    };
    // Update link mark toDom to render a span instead of anchor tag
    // Since editable false PM Editor treats anchor tag as a normal a tag
    // and redirects
    const linkMarkSpec = spec.marks.get("link");
    if (linkMarkSpec) {
        spec.marks = spec.marks.update("link", Object.assign({}, linkMarkSpec, {
            toDOM: (mark, inline) => {
                const dom = linkMarkSpec.toDOM(mark, inline);
                dom[0] = "span";
                return dom;
            }
        }));
    }
    return new Schema(spec);
};
//# sourceMappingURL=schema.js.map