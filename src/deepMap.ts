// Registered Symbols are not supported as keys in a WeakMap.
// Firefox also does not yet support any Symbol as a WeakMap key.
function supportedInWeakMap(symbol: Symbol) {
    try {
        new WeakMap().set(symbol, undefined)
        return true
    } catch {
        return false
    }
}

export class DeepMapEntry<T> {
    isDisposed = false
    private hash: string

    constructor(
        private readonly state: {
            store: Map<string, T>
            weakHashes: WeakMap<object | Function | Symbol, string> | undefined
            strongHashes: Map<Symbol, string> | undefined
            hashId: number
        },
        args: Array<Readonly<unknown> | undefined | null>
    ) {
        this.hash = args.map((arg) => this.prehash(arg)).join("")
    }

    private prehash(arg: Readonly<unknown> | undefined | null): string | number {
        if (arg === null) {
            return "null"
        }

        switch (typeof arg) {
            case "string":
                return `s:${arg}`
            case "number":
                return `n:${arg}`
            case "boolean":
                return arg ? "true" : "false"
            case "undefined":
                return "undefined"
            case "object":
            case "function":
            case "symbol":
                const strongHash = typeof arg === "symbol" && !supportedInWeakMap(arg)
                const hashes = this.getHashes(strongHash)
                if (hashes.has(arg)) return hashes.get(arg)!

                const hash = `o:${this.state.hashId++}`
                hashes.set(arg, hash)

                return hash
            case "bigint":
                return `N:${arg}`
            default:
                throw new Error("Unknown type")
        }
    }

    private getHashes(strongHash: boolean) {
        if (strongHash) {
            if (!this.state.strongHashes) {
                this.state.strongHashes = new Map()
            }
            return this.state.strongHashes
        }
        if (!this.state.weakHashes) {
            this.state.weakHashes = new Map()
        }
        return this.state.weakHashes
    }

    exists(): boolean {
        this.assertNotDisposed()
        return this.state.store.has(this.hash)
    }

    get(): T {
        this.assertNotDisposed()
        if (!this.exists()) throw new Error("Entry doesn't exist")
        return this.state.store.get(this.hash)!
    }

    set(value: T) {
        this.assertNotDisposed()
        this.state.store.set(this.hash, value)
    }

    delete() {
        this.assertNotDisposed()
        if (!this.exists()) throw new Error("Entry doesn't exist")
        this.state.store.delete(this.hash)
        this.isDisposed = true
    }

    private assertNotDisposed() {
        // TODO: once this becomes annoying, we should introduce a reset method to re-run the constructor logic
        if (this.isDisposed) throw new Error("Concurrent modification exception")
    }
}

/**
 * @private
 */
export class DeepMap<T> {
    private readonly state = {
        store: new Map<string, T>(),
        weakHashes: undefined,
        strongHashes: undefined,
        hashId: 0,
    }
    private argsLength = -1
    private last: DeepMapEntry<T> | undefined

    entry(args: Array<Readonly<unknown> | undefined | null>): DeepMapEntry<T> {
        if (this.argsLength === -1) this.argsLength = args.length
        else if (this.argsLength !== args.length)
            throw new Error(
                `DeepMap should be used with functions with a consistent length, expected: ${this.argsLength}, got: ${args.length}`
            )
        if (this.last) this.last.isDisposed = true

        return (this.last = new DeepMapEntry(this.state, args))
    }
}
