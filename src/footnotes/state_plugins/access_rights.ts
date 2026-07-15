import {Plugin, PluginKey} from "prosemirror-state"
import type {Transaction} from "prosemirror-state"

import {COMMENT_ONLY_ROLES, READ_ONLY_ROLES} from "../../index.js"
import type {Editor} from "../../types.js"

const key = new PluginKey("accessRights")

export const accessRightsPlugin = (options: {editor: Editor}) =>
    new Plugin({
        key,
        filterTransaction: (tr: Transaction, _state) => {
            let allowed = true
            const remote = tr.getMeta("remote")
            const fromMain = tr.getMeta("fromMain")
            if (remote || fromMain) {
                return allowed
            }

            if (
                (COMMENT_ONLY_ROLES.includes(
                    options.editor.docInfo.access_rights!
                ) ||
                    READ_ONLY_ROLES.includes(
                        options.editor.docInfo.access_rights!
                    )) &&
                tr.docChanged
            ) {
                allowed = false
            }

            if (
                tr.docs.length &&
                tr.docs[0]?.childCount !== tr.doc.childCount
            ) {
                allowed = false
            }

            return allowed
        }
    })
