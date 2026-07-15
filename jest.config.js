/** @type {import("jest").Config} */
export default {
    rootDir: ".",
    testEnvironment: "node",
    resolver: "ts-jest-resolver",
    extensionsToTreatAsEsm: [".ts"],
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: {
                    module: "NodeNext",
                    moduleResolution: "NodeNext"
                }
            }
        ]
    },
    testMatch: ["<rootDir>/test/**/*.test.ts"],
    setupFiles: ["<rootDir>/test/setup.js"],
    moduleFileExtensions: ["ts", "js", "mjs", "json"],
    transformIgnorePatterns: [],
    moduleDirectories: ["node_modules"],
    moduleNameMapper: {
        "^downloadjs$": "<rootDir>/test/mocks/downloadjs.js",
        "^fwtoolkit$": "<rootDir>/test/mocks/fwtoolkit.js",
        "^fwtoolkit/.*": "<rootDir>/test/mocks/fwtoolkit.js",
        "^bibliojson$": "<rootDir>/test/mocks/bibliojson.js",
        "^bibliojson/.*": "<rootDir>/test/mocks/bibliojson.js",
        "^pretty$": "<rootDir>/test/mocks/pretty.js",
        "^mathlive$": "<rootDir>/test/mocks/mathlive.js",
        "^mathlive/.*": "<rootDir>/test/mocks/mathlive.js",
        "^mathml2omml$": "<rootDir>/test/mocks/mathml2omml.js",
        "^cropperjs$": "<rootDir>/test/mocks/cropperjs.js",
        "^sortablejs$": "<rootDir>/test/mocks/sortablejs.js",
        "^prosemirror-state$": "<rootDir>/test/mocks/prosemirror-state.js",
        "^prosemirror-view$": "<rootDir>/test/mocks/prosemirror-view.js",
        "^prosemirror-model$": "<rootDir>/test/mocks/prosemirror-model.js",
        "^prosemirror-transform$": "<rootDir>/test/mocks/prosemirror-transform.js",
        "^prosemirror-commands$": "<rootDir>/test/mocks/prosemirror-commands.js",
        "^prosemirror-history$": "<rootDir>/test/mocks/prosemirror-history.js",
        "^prosemirror-keymap$": "<rootDir>/test/mocks/prosemirror-keymap.js",
        "^prosemirror-gapcursor$": "<rootDir>/test/mocks/prosemirror-gapcursor.js",
        "^prosemirror-schema-basic$": "<rootDir>/test/mocks/prosemirror-schema-basic.js",
        "^prosemirror-schema-list$": "<rootDir>/test/mocks/prosemirror-schema-list.js",
        "^prosemirror-tables$": "<rootDir>/test/mocks/prosemirror-tables.js",
        "^prosemirror-changeset$": "<rootDir>/test/mocks/prosemirror-changeset.js",
        "^prosemirror-collab$": "<rootDir>/test/mocks/prosemirror-collab.js",
        "^prosemirror-dropcursor$": "<rootDir>/test/mocks/prosemirror-dropcursor.js",
        "^prosemirror-suggestions$": "<rootDir>/test/mocks/prosemirror-suggestions.js",
        "^prosemirror-example-setup$": "<rootDir>/test/mocks/prosemirror-example-setup.js",
        "^prosemirror-inputrules$": "<rootDir>/test/mocks/prosemirror-inputrules.js",
        "^diff-dom$": "<rootDir>/test/mocks/diff-dom.js",
        "^diff$": "<rootDir>/test/mocks/diff.js",
        "^fast-xml-parser$": "<rootDir>/test/mocks/fast-xml-parser.js",
        "^jszip$": "<rootDir>/test/mocks/jszip.js",
        "^citeproc-plus$": "<rootDir>/test/mocks/citeproc-plus.js",
        "^citeproc-plus/.*": "<rootDir>/test/mocks/citeproc-plus.js",
        "^@fiduswriter/common$": "<rootDir>/test/mocks/common.js",
        "^@fiduswriter/common/.*": "<rootDir>/test/mocks/common.js",
        "^@fiduswriter/document$": "<rootDir>/test/mocks/document.js",
        "^@fiduswriter/document/.*": "<rootDir>/test/mocks/document.js",
        "^@fiduswriter/bibliography-manager$": "<rootDir>/test/mocks/bibliography-manager.js",
        "^@fiduswriter/bibliography-manager/.*": "<rootDir>/test/mocks/bibliography-manager.js",
        "^@fiduswriter/image-manager$": "<rootDir>/test/mocks/image-manager.js",
        "^@fiduswriter/image-manager/.*": "<rootDir>/test/mocks/image-manager.js"
    }
}
