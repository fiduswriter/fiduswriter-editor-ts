import { escapeText } from "fwtoolkit";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
const key = new PluginKey("tocRender");
function getTocItems(decorations) {
    let tocItems;
    decorations.find(undefined, undefined, (deco) => {
        if (deco.spec.tocItems) {
            tocItems = deco.spec.tocItems;
            return true;
        }
        return false;
    });
    return tocItems;
}
function tocHTML(tocItems, title) {
    return `<h1 class="toc">${escapeText(title)}</h1>
    ${tocItems
        .map(item => {
        const level = item.type.name.substr(-1);
        return `<h${level}><a href="#${item.id}">${escapeText(item.textContent)}</a></h${level}>`;
    })
        .join("")}`;
}
class ToCView {
    node;
    view;
    getPos;
    dom;
    innerView;
    contentDOM;
    constructor(node, view, getPos) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.dom = document.createElement("div");
        this.dom.classList.add("content-container", "toc");
        this.dom.id = node.attrs.id;
        this.innerView = document.createElement("div");
        this.dom.appendChild(this.innerView);
        this.contentDOM = document.createElement("div");
        this.dom.appendChild(this.contentDOM);
        this.update(node);
    }
    update(node) {
        if (node.type !== this.node.type) {
            return false;
        }
        this.node = node;
        const tocPlugin = this.view.state.plugins.find(plugin => plugin.spec.key === key);
        const tocItems = tocPlugin
            ? getTocItems(key.getState(this.view.state))
            : undefined;
        if (tocItems) {
            this.innerView.innerHTML = tocHTML(tocItems, node.attrs.title);
        }
        return true;
    }
    stopEvent() {
        return true;
    }
}
function findTocItems(doc) {
    const items = [];
    doc.descendants(node => {
        if (node.type.name.startsWith("heading") && node.attrs.id) {
            items.push({
                type: node,
                id: node.attrs.id,
                textContent: node.textContent
            });
        }
    });
    return items;
}
export const tocRenderPlugin = (_options) => new Plugin({
    key,
    state: {
        init(_config, state) {
            const tocItems = findTocItems(state.doc);
            return DecorationSet.create(state.doc, [
                Decoration.widget(1, () => document.createElement("span"), {
                    tocItems
                })
            ]);
        },
        apply(tr, value, _oldState, newState) {
            value = value.map(tr.mapping, tr.doc);
            if (!tr.docChanged) {
                return value;
            }
            const tocItems = findTocItems(newState.doc);
            const deco = Decoration.widget(1, () => document.createElement("span"), {
                tocItems
            });
            return DecorationSet.create(newState.doc, [deco]);
        }
    },
    props: {
        nodeViews: {
            toc: (node, view, getPos) => new ToCView(node, view, getPos)
        }
    }
});
//# sourceMappingURL=toc_render.js.map