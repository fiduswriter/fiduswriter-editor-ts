export class Decoration {
    constructor(from, to, attrs, spec) {
        this.from = from
        this.to = to
        this.attrs = attrs
        this.spec = spec
    }

    static inline(from, to, attrs, spec) {
        return new Decoration(from, to, attrs, spec)
    }
}

export class DecorationSet {
    constructor() {}

    static get empty() {
        return new DecorationSet()
    }

    add(_doc, _decorations) {
        return this
    }

    remove(_decorations) {
        return this
    }

    map(_mapping, _doc) {
        return this
    }

    find(_from, _to) {
        return []
    }
}

export class EditorView {}
