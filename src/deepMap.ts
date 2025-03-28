/**
 * @private
 */
export class DeepMapEntry<T> {
    private root: Map<any, any>
    private closest: Map<any, any>
    private closestIdx: number = 0

    constructor(
        private base: Map<any, any>,
        private args: any[],
        private version: number,
        private versionChecker: (version: number) => boolean
    ) {
        let current: undefined | Map<any, any> = (this.closest = this.root = base)
        let i = 0
        for (; i < this.args.length - 1; i++) {
            current = current!.get(args[i])
            if (current) this.closest = current
            else break
        }
        this.closestIdx = i
    }

    exists(): boolean {
        this.assertCurrentVersion()
        const l = this.args.length
        return this.closestIdx >= l - 1 && this.closest.has(this.args[l - 1])
    }

    get(): T {
        this.assertCurrentVersion()
        if (!this.exists()) throw new Error("Entry doesn't exist")
        return this.closest.get(this.args[this.args.length - 1])
    }

    set(value: T) {
        this.assertCurrentVersion()
        const l = this.args.length
        let current: Map<any, any> = this.closest
        // create remaining maps
        for (let i = this.closestIdx; i < l - 1; i++) {
            const m = new Map()
            current.set(this.args[i], m)
            current = m
        }
        this.closestIdx = l - 1
        this.closest = current
        current.set(this.args[l - 1], value)
    }

    delete() {
        this.assertCurrentVersion()
        if (!this.exists()) throw new Error("Entry doesn't exist")
        const l = this.args.length
        this.closest.delete(this.args[l - 1])
        // clean up remaining maps if needed (reconstruct stack first)
        let c = this.root
        const maps: Map<any, any>[] = [c]
        for (let i = 0; i < l - 1; i++) {
            c = c.get(this.args[i])!
            maps.push(c)
        }
        for (let i = maps.length - 1; i > 0; i--) {
            if (maps[i].size === 0) maps[i - 1].delete(this.args[i - 1])
        }
    }

    private assertCurrentVersion() {
        if (!this.versionChecker(this.version)) {
            throw new Error("Concurrent modification exception")
        }
    }
}

/**
 * @private
 */
export class DeepMap<T> {
    private store = new Map<any, any>()
    private argsLength = -1
    private currentVersion = 0

    private checkVersion(version: number) {
        return this.currentVersion === version
    }

    entry(args: any[]): DeepMapEntry<T> {
        if (this.argsLength === -1) this.argsLength = args.length
        else if (this.argsLength !== args.length)
            throw new Error(
                `DeepMap should be used with functions with a consistent length, expected: ${this.argsLength}, got: ${args.length}`
            )

        this.currentVersion++
        return new DeepMapEntry(this.store, args, this.currentVersion, this.checkVersion.bind(this))
    }
}
