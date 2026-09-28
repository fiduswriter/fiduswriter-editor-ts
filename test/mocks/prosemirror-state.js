export class Plugin {
    constructor(spec) {
        this.spec = spec
    }
}

export class PluginKey {
    constructor(name) {
        this.name = name
    }

    getState(_state) {
        return {
            decos: {
                find: () => [],
                add: () => ({}),
                remove: () => ({})
            },
            matches: []
        }
    }
}

export class TextSelection {
    static create() {
        return new TextSelection()
    }
}

export class EditorState {}
export class Transaction {}
export const Selection = class {}
