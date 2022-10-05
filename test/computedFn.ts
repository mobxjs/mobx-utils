import { computedFn } from "../src/computedFn"
import {
    observable,
    autorun,
    onBecomeUnobserved,
    action,
    getDependencyTree,
    comparer,
    getObserverTree,
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
