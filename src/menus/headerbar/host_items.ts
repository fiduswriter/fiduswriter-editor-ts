import type {HostFileMenuItem, HostMenuContribution} from "../../types.js"

/**
 * Splice host-provided entries into a built headerbar model.
 *
 * A host without a Fidus Writer backend owns the document lifecycle — which
 * file is open, where it is saved, what "New" means — so the editor cannot
 * supply Open, Save as or New itself. Passing those here puts them in the
 * editor's own File menu instead of forcing the host to bolt a separate
 * toolbar onto the page. The same mechanism lets a host extend any other menu
 * (a desktop application putting "User preferences" at the end of Settings, a
 * WordPress plugin adding an entry to Tools) or add a top-level menu of its
 * own.
 *
 * Applied after construction, the same way `document_template` adds its own
 * "Create copy as ..." entry, so there is one menu and one look.
 */
export function addHostMenuItems(
    model: unknown,
    contributions: HostMenuContribution[] | undefined
): void {
    if (!contributions?.length) {
        return
    }
    const headerbar = model as {
        content?: HostMenu[]
    }
    if (!headerbar.content) {
        return
    }
    for (const contribution of contributions) {
        if (!contribution?.items?.length || !contribution.menuId) {
            continue
        }
        const menu = headerbar.content.find(
            menu => menu.id === contribution.menuId
        )
        if (!menu?.content) {
            // No such menu yet: create it, unless there is no title to give
            // it, in which case the entries would be unreachable.
            if (!contribution.menuTitle) {
                continue
            }
            const created: HostMenu = {
                id: contribution.menuId,
                title: contribution.menuTitle,
                type: "menu",
                ...(contribution.keys ? {keys: contribution.keys} : {}),
                content: []
            }
            // New menus go to the far right of the menu bar: the view renders
            // `content` in array order.
            headerbar.content.push(created)
            spliceMenuItems(created, contribution.items, contribution.position)
            continue
        }
        spliceMenuItems(menu, contribution.items, contribution.position)
    }
}

/** A minimal subset of the headerbar model's menu/menu-item shape. */
interface HostMenu {
    id?: string
    // `unknown`: the helper only carries titles through, never calls them, and
    // the model's titles may be `(editor: Editor) => string` functions.
    title?: unknown
    type?: string
    keys?: string
    content?: HostMenu[]
}

/**
 * Merge host entries into one menu.
 *
 * An entry whose id matches an existing one replaces it *in place*, so
 * overriding an entry cannot silently reorder the menu, and rebuilding cannot
 * accumulate copies. Entries with an id that is not present yet are added at
 * the start or the end of the menu, per `position`.
 */
function spliceMenuItems(
    menu: HostMenu,
    items: HostFileMenuItem[],
    position?: "start" | "end"
): void {
    const existing = menu.content as Array<{id?: string}> | undefined
    if (!existing) {
        return
    }
    const existingIds = new Set(existing.map(item => item?.id).filter(Boolean))
    // An entry whose id is already present replaces it, so a host that rebuilds
    // its menu does not accumulate duplicates.
    const byId = new Map(
        items.filter(item => item.id).map(item => [item.id as string, item])
    )
    const asAction = (item: HostFileMenuItem) => ({
        type: "action" as const,
        ...item
    })

    const replaced = existing.map(item =>
        item?.id && byId.has(item.id)
            ? asAction(byId.get(item.id) as HostFileMenuItem)
            : item
    )

    const additions = items
        .filter(item => !item.id || !existingIds.has(item.id))
        .map(asAction)

    menu.content =
        position === "end"
            ? [...replaced, ...additions]
            : [...additions, ...replaced]
}
