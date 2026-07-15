import deepEqual from "fast-deep-equal"

function randomID(): number {
    return Math.floor(Math.random() * 0xffffffff)
}

export class ModBibliographyDB {
    mod: any
    db: Record<string, any> | false
    unsent: {type: string; id?: number; reference?: any}[]
    // cats aren't used, but we keep this for consistency
    cats: any[]

    constructor(mod: any) {
        mod.bibDB = this
        this.mod = mod
        this.db = false
        this.unsent = []
        // cats aren't used, but we keep this for consistency
        this.cats = []
    }

    setDB(db: Record<string, any>): void {
        this.db = db
        this.unsent = []
    }

    mustSend(): void {
        // Set a timeout so that the update can be combines with other updates
        // if they happen more or less simultaneously.
        window.setTimeout(
            () => this.mod.editor.mod.collab.doc.sendToCollaborators(),
            100
        )
    }

    // function saveBibEntries is the same as in user's individual BibliographyDB.
    // Function added to make document's and user's bibDBs be connectable to the
    // same interface functions.
    saveBibEntries(
        tmpDB: Record<string, any>,
        isNew: boolean
    ): Promise<[number, number][]> {
        const idTranslations: [number, number][] = []
        Object.keys(tmpDB).forEach(bibKey => {
            const reference = tmpDB[bibKey],
                bibId = Number.parseInt(bibKey)
            delete reference.cats
            const oldRef = this.findReference(reference)
            if (oldRef) {
                idTranslations.push([bibId, oldRef])
            } else if (isNew) {
                const id = this.addReference(reference, bibId)
                idTranslations.push([bibId, id])
            } else {
                this.updateReference(bibId, reference)
                idTranslations.push([bibId, bibId])
            }
            // We don't use cats in the document internal bibDB, so just
            // to make sure, we remove it.
        })
        return Promise.resolve(idTranslations)
    }

    // Function added here for compatibility with user's bibDB. See comment at
    // saveBibEntries function.
    updateLocalBibEntries(
        tmpDB: Record<string, any>,
        idTranslations: [number, number][]
    ): [number, number][] {
        idTranslations.forEach(bibTrans => {
            this.updateLocalReference([bibTrans[1]], tmpDB[String(bibTrans[0])])
        })
        return idTranslations
    }

    // Function added here for compatibility with user's bibDB. See comment at
    // saveBibEntries function.
    deleteBibEntries(ids: number[]): Promise<number[]> {
        ids.forEach(id => this.deleteReference(id))
        return Promise.resolve(ids)
    }

    // This function only makes real sense in the user's bibDB. It is kept here
    // for compatibility reasons.
    getDB(): Promise<{bibPks: number[]; bibCats: any[]}> {
        return new Promise(resolve => {
            window.setTimeout(() => resolve({bibPks: [], bibCats: []}), 100)
        })
    }

    addReference(reference: any, id: number): number {
        while (!id || (this.db && (this.db as Record<string, any>)[String(id)])) {
            id = randomID()
        }
        this.updateReference(id, reference)
        return id
    }

    // Add or update a reference to the bibliography database both remotely and locally.
    updateReference(id: number, reference: any): void {
        this.updateLocalReference(id, reference)
        this.unsent.push({
            type: "update",
            id
        })
        this.mustSend()
    }

    // Add or update a reference only locally.
    updateLocalReference(id: number | number[], reference: any): void {
        if (Array.isArray(id)) {
            id = id[0]
        }
        const preExisting =
            this.db && (this.db as Record<string, any>)[String(id)] ? true : false
        ;(this.db as Record<string, any>)[String(id)] = reference
        if (preExisting) {
            this.mod.editor.mod.citations.resetCitations()
        } else {
            this.mod.editor.mod.citations.layoutCitations()
        }
    }

    deleteReference(id: number): void {
        this.deleteLocalReference(id)
        this.unsent.push({
            type: "delete",
            id
        })
        this.mustSend()
    }

    deleteLocalReference(id: number): void {
        if (this.db) {
            delete (this.db as Record<string, any>)[String(id)]
        }
    }

    hasUnsentEvents(): number {
        return this.unsent.length
    }

    unsentEvents(): {type: string; id?: number; reference?: any}[] {
        return this.unsent.map(event => {
            if (event.type === "delete") {
                return event
            } else if (event.type === "update") {
                // Check bib entry still exists. Otherwise ignore.
                const reference =
                    this.db &&
                    (this.db as Record<string, any>)[String(event.id)]
                if (reference) {
                    return {
                        type: "update",
                        id: event.id,
                        reference
                    }
                } else {
                    return {
                        type: "ignore"
                    }
                }
            }
            return {type: "ignore"}
        })
    }

    eventsSent(n: {length: number}): void {
        this.unsent = this.unsent.slice(n.length)
    }

    receive(events: {type: string; id?: number; reference?: any}[]): void {
        events.forEach(event => {
            if (event.type == "delete") {
                this.deleteLocalReference(event.id as number)
            } else if (event.type == "update") {
                this.updateLocalReference(event.id as number, event.reference)
            }
        })
    }

    findReference(ref: any): number {
        if (!this.db) {
            return 0
        }
        return Number(
            Object.keys(this.db).find(id => {
                const bib = (this.db as Record<string, any>)[id]
                return (
                    bib.bib_type === ref.bib_type &&
                    deepEqual(bib.fields, ref.fields)
                )
            }) || 0
        )
    }

    hasReference(ref: any): boolean {
        if (this.findReference(ref) !== 0) {
            return true
        } else {
            return false
        }
    }
}
