import type {HostFileMenuItem} from "../../types.js"

/**
 * Splice host-provided entries into a built headerbar model's File menu.
 *
 * A host without a Fidus Writer backend owns the document lifecycle — which
 * file is open, where it is saved, what "New" means — so the editor cannot
 * supply Open, Save as or New itself. Passing them here puts them in the
 * editor's own File menu instead of forcing the host to bolt a separate
 * toolbar onto the page.
 *
 * Applied after construction, the same way `document_template` adds its own
 * "Create copy as ..." entry, so there is one menu and one look.
 */
export function addHostFileMenuItems(
    model: unknown,
    items: HostFileMenuItem[] | undefined
): void {
    if (!items?.length) {
        return
    }
    const headerbar = model as {
        content?: Array<{id?: string; content?: unknown[]}>
    }
    const fileMenu = headerbar.content?.find(menu => menu.id === "file")
    if (!fileMenu?.content) {
        return
    }
    const existing = fileMenu.content as Array<{id?: string}>
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

    // A host entry whose id matches an existing one replaces it *in place*,
    // so overriding an entry cannot silently reorder the menu, and rebuilding it
    // cannot accumulate copies.
    const replaced = existing.map(item =>
        item?.id && byId.has(item.id)
            ? asAction(byId.get(item.id) as HostFileMenuItem)
            : item
    )

    // Entries with an id that is not present yet go to the top: they act on the
    // host's document lifecycle rather than on this particular document. The
    // view renders `content` in array order, so prepending is what puts them
    // there.
    const additions = items
        .filter(item => !item.id || !existingIds.has(item.id))
        .map(asAction)

    fileMenu.content = [...additions, ...replaced]
}
