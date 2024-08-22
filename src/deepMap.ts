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
            weakHashes: WeakMap<object | Function | Symbol, string>
            strongHashes: Map<Symbol, string>
            hashId: number
        },
        args: Array<Readonly<unknown>>
    ) {
        this.hash = args.map((arg) => this.prehash(arg)).join("")
    }

    private prehash(arg: Readonly<unknown>): string | number {
        if (typeof arg === "string") {
            return `s:${arg}`
        }
        if (typeof arg === "number") {
            return `n:${arg}`
        }
        if (arg === null) {
            return "null"
        }
        if (typeof arg === "boolean") {
            return arg ? "true" : "false"
        }
        if (typeof arg === "undefined") {
            return "undefined"
        }
        if (typeof arg === "object" || typeof arg === "function" || typeof arg === "symbol") {
            let hashes = this.state.weakHashes
            if (typeof arg === "symbol" && !supportedInWeakMap(arg)) {
                hashes = this.state.strongHashes
            }

            if (hashes.has(arg)) return hashes.get(arg)!

            const hash = `o:${this.state.hashId++}`
            hashes.set(arg, hash)
            return hash
        }
        if (typeof arg === "bigint") {
            return `N:${arg}`
        }

        throw new Error("Unknown type")
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
        weakHashes: new WeakMap<object | Function | Symbol, string>(),
        strongHashes: new Map<Symbol, string>(),
        hashId: 0,
    }
    private argsLength = -1
    private last: DeepMapEntry<T> | undefined

    entry(args: Array<Readonly<unknown>>): DeepMapEntry<T> {
        if (this.argsLength === -1) this.argsLength = args.length
        else if (this.argsLength !== args.length)
            throw new Error(
                `DeepMap should be used with functions with a consistent length, expected: ${this.argsLength}, got: ${args.length}`
            )
        if (this.last) this.last.isDisposed = true

        return (this.last = new DeepMapEntry(this.state, args))
    }
}
