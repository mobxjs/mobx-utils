import { computedFn } from "../src/computedFn"
import {
    observable,
    autorun,
    onBecomeUnobserved,
    action,
    getDependencyTree,
    comparer,
    getObserverTree,
    computed,
    runInAction,
    createAtom,
    IAtom,
} from "mobx"

const john = {
    name: "john",
    age: 15,
}
const jane = {
    name: "jane",
    age: 45,
}
const able = {
    name: "able",
    age: 12,
}

class Store {
    persons = observable([john, jane, able])

    constructor(public events: string[]) {}

    filter(age: number, firstLetter: string) {
        this.events.push(`f ${age} ${firstLetter}`)
        return this.persons.filter((p) => {
            return p.age > age && (!firstLetter || p.name[0] === firstLetter)
        })
    }
}

test("basics - kept alive", () => {
    const events: string[] = []
    const s = new Store(events)

    onBecomeUnobserved(s.persons, () => {
        events.push("unobserved persons")
    })

    s.filter = computedFn(s.filter, true)

    expect(s.filter(20, "")).toEqual([jane])
    expect(s.filter(1, "j")).toEqual([john, jane])
    expect(s.filter(20, "")).toEqual([jane])

    expect(events.splice(0)).toEqual(["f 20 ", "f 1 j"])

    const d = autorun(() => {
        events.push(
            s
                .filter(1, "j")
                .map((p) => p.name)
                .join("-")
        )
    })

    s.persons[2].name = "jable"
    s.persons[1].name = "ane"

    s.persons[2].age = 0

    d()

    expect(s.filter(20, "")).toEqual([{ name: "ane", age: 45 }])
    expect(s.filter(20, "")).toEqual([{ name: "ane", age: 45 }])

    expect(events.splice(0)).toEqual([
        "john-jane",
        "f 1 j",
        "john-jane-jable",
        "f 1 j",
        "john-jable",
        "f 1 j",
        "john",
        "f 20 ",
    ])
})

test("basics - auto suspend", () => {
    const events: string[] = []
    const s = new Store(events)

    onBecomeUnobserved(s.persons, () => {
        events.push("unobserved persons")
    })

    s.filter = computedFn(s.filter, false)

    expect(s.filter(20, "")).toEqual([jane])
    expect(s.filter(1, "j")).toEqual([john, jane])
    expect(s.filter(20, "")).toEqual([jane])

    expect(events.splice(0)).toEqual([
        "f 20 ",
        "f 1 j",
        "f 20 ", //suspended
    ])

    const d = autorun(() => {
        events.push(
            s
                .filter(1, "j")
                .map((p) => p.name)
                .join("-")
        )
    })

    s.persons[2].name = "jable"
    s.persons[1].name = "ane"

    s.persons[2].age = 0

    d()

    expect(s.filter(20, "")).toEqual([{ name: "ane", age: 45 }])
    expect(s.filter(20, "")).toEqual([{ name: "ane", age: 45 }])

    expect(events.splice(0)).toEqual([
        "f 1 j", // was suspended
        "john-jane",
        "f 1 j",
        "john-jane-jable",
        "f 1 j",
        "john-jable",
        "f 1 j",
        "john",
        "unobserved persons", // all suspended!
        "f 20 ",
        "f 20 ",
    ])
})

test("make sure the fn is cached", () => {
    const events: string[] = []

    const store = observable({
        a: 1,
        b: 2,
        c: 3,
        m: computedFn(function m(x) {
            expect(this).toBe(store)
            events.push("calc " + x)
            return this.a * this.b * x
        }),
    })

    const d = autorun(() => {
        events.push("autorun " + store.m(3) * store.c)
    })

    expect(getDependencyTree(d)).toMatchSnapshot()

    store.b = 3
    store.c = 4

    expect(events).toEqual(["calc 3", "autorun 18", "calc 3", "autorun 27", "autorun 36"])
})

test("supports options", () => {
    const events: number[][] = []
    const xs = observable([1, 2, 3])
    const xsLessThan = computedFn((n) => xs.filter((x) => x < n), { equals: comparer.structural })

    autorun(() => events.push(xsLessThan(3)))
    expect(events).toEqual([[1, 2]])

    events.length = 0
    xs.push(4)
    expect(events).toEqual([])
})

test("supports onCleanup", () => {
    const sep = observable.box(".")
    const unloaded: unknown[] = []
    const joinedStr = computedFn((sep) => [1, 2, 3].join(sep), {
        onCleanup: (result, sep) => unloaded.push([result, sep]),
    })
    autorun(() => joinedStr(sep.get()))
    sep.set(",")
    expect(unloaded.length).toBe(1)
    sep.set(" ")
    expect(unloaded).toEqual([
        ["1.2.3", "."],
        ["1,2,3", ","],
    ])
})

test("should not allow actions", () => {
    expect(() => computedFn(action(() => {}))).toThrow("action")
})

test("evicts entries that are only read inside an action once the batch ends", () => {
    const events: string[] = []
    const unloaded: unknown[] = []
    const store = observable({ x: 1 })
    const double = computedFn(
        (n: number) => {
            events.push("calc " + n)
            return store.x * n
        },
        { onCleanup: (result, n) => unloaded.push([result, n]) }
    )

    // a computed read inside an action is a derivation that nothing observes: the entry is memoized
    // for the batch, then evicted and cleaned up like any unobserved entry
    runInAction(() => {
        expect(computed(() => double(2) + double(2)).get()).toBe(4)
        expect(unloaded).toEqual([])
    })
    expect(events).toEqual(["calc 2"])
    expect(unloaded).toEqual([[2, 2]])

    // an untracked read is not served by a pinned entry: computed and cleaned up right away
    expect(double(2)).toBe(2)
    expect(events).toEqual(["calc 2", "calc 2"])
    expect(unloaded).toEqual([
        [2, 2],
        [2, 2],
    ])
})

test("caches and evicts normally after the same arguments were read inside an action", () => {
    const events: string[] = []
    const unloaded: unknown[] = []
    const store = observable({ x: 1 })
    const double = computedFn(
        (n: number) => {
            events.push("calc " + n)
            return store.x * n
        },
        { onCleanup: (result, n) => unloaded.push([result, n]) }
    )

    runInAction(() => computed(() => double(2)).get())
    const d = autorun(() => events.push("autorun " + double(2)))
    // served from the entry created by the autorun
    expect(double(2)).toBe(2)
    runInAction(() => {
        store.x = 2
    })
    d()

    expect(events).toEqual(["calc 2", "calc 2", "autorun 2", "calc 2", "autorun 4"])
    expect(unloaded).toEqual([
        [2, 2],
        [4, 2],
    ])
})

test("cleans up a value computed by an observed computed inside an action exactly once", () => {
    const events: string[] = []
    const unloaded: unknown[] = []
    const store = observable({ x: 1 })
    const tenfold = computedFn(
        (n: number) => {
            events.push("calc " + n)
            return n * 10
        },
        { onCleanup: (result, n) => unloaded.push([result, n]) }
    )
    const k = computed(() => tenfold(store.x))

    const d = autorun(() => events.push("autorun " + k.get()))
    // recomputed inside the action with a new argument: mobx 6 does not mark the new entry as
    // observed (mobx 7 does since 7.0.4), either way it is cleaned up once, when it is evicted
    runInAction(() => {
        store.x = 2
        expect(k.get()).toBe(20)
    })
    expect(unloaded).toEqual([[10, 1]])
    d()

    expect(events).toEqual(["calc 1", "autorun 10", "calc 2", "autorun 20"])
    expect(unloaded).toEqual([
        [10, 1],
        [20, 2],
    ])
})

test("keeps an entry read inside an action while a reaction from the same batch observes it", () => {
    const cleanups: string[] = []
    const storeFor = computedFn((key: string) => observable({ key, value: 0 }), {
        onCleanup: (_, key) => cleanups.push(key),
    })
    const current = computed(() => storeFor("B"))
    const seen: number[] = []

    // read inside the action first, then observed while cached
    const d = runInAction(() => {
        current.get()
        return autorun(() => seen.push(current.get().value))
    })
    runInAction(() => {
        storeFor("B").value = 42
    })
    expect(cleanups).toEqual([])
    d()

    expect(seen).toEqual([0, 42])
    expect(cleanups).toEqual(["B"])
})

test("evicts an entry read inside an action even if it throws", () => {
    let calls = 0
    const unloaded: unknown[] = []
    const fail = computedFn(
        (n: number) => {
            calls++
            throw new Error("fail " + n)
        },
        { onCleanup: (result, n) => unloaded.push([result, n]) }
    )

    expect(() => runInAction(() => computed(() => fail(1)).get())).toThrow("fail 1")
    expect(unloaded).toEqual([[undefined, 1]])
    expect(() => fail(1)).toThrow("fail 1")
    expect(calls).toBe(2)
})

test("observes the dependencies of an entry like a plain computed", () => {
    // hooks of a dependency read inside an action, then by a reaction created in the same batch
    function dependencyHooks(createRead: (dep: IAtom) => () => unknown) {
        const hooks: string[] = []
        const dep = createAtom(
            "dep",
            () => hooks.push("observed"),
            () => hooks.push("unobserved")
        )
        const read = createRead(dep)
        runInAction(() => computed(read).get())
        hooks.push("read inside an action")
        const k = computed(read)
        const d = runInAction(() => {
            k.get()
            return autorun(() => k.get())
        })
        hooks.push("observed by a reaction")
        d()
        return hooks
    }

    const throughComputedFn = dependencyHooks((dep) => {
        const f = computedFn((n: number) => {
            dep.reportObserved()
            return n
        })
        return () => f(1)
    })
    const throughComputed = dependencyHooks((dep) => {
        const c = computed(() => {
            dep.reportObserved()
            return 1
        })
        return () => c.get()
    })
    // on mobx 7 an entry that is marked as observed too early or too late changes this sequence
    expect(throughComputedFn).toEqual(throughComputed)
})

test("caches nested computedFn calls while observed", () => {
    const events: string[] = []
    const store = observable({ x: 1, y: 1 })
    const inner = computedFn((n: number) => {
        events.push("inner " + n)
        return store.x * n
    })
    const outer = computedFn((n: number) => {
        events.push("outer " + n)
        return inner(n) + store.y
    })

    const d = autorun(() => events.push("autorun " + outer(2)))
    runInAction(() => {
        store.y = 2
    })
    d()

    expect(events).toEqual(["outer 2", "inner 2", "autorun 3", "outer 2", "autorun 4"])
})
