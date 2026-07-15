import {OrderedListStartDialog} from "../../dialogs/index.js"
import type {Editor} from "../../types.js"

export const orderedListMenuModel = () => ({
    content: [
        {
            title: gettext("Set list start number"),
            type: "action",
            tooltip: gettext(
                "Specify the number from which this list is to start counting"
            ),
            order: 0,
            action: (editor: Editor) => {
                const dialog = new OrderedListStartDialog(editor)
                dialog.init()
                return false
            }
        }
    ]
})
