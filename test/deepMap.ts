import { DeepMap } from "../src/deepMap"

test("args length 2", () => {
    const d = new DeepMap<number>()

    const e = d.entry(["hello", "world"])

    expect(e.exists()).toBe(false)

    expect(() => {
        e.get()
    }).toThrowErrorMatchingSnapshot()

    e.set(3)

    expect(e.get()).toBe(3)
    expect(e.exists()).toBe(true)

    const e2 = d.entry(["hello", "world"])
    expect(e2.exists()).toBe(true)
    expect(e2.get()).toBe(3)

    e2.set(4)
    expect(() => {
        e.get()
    }).toThrowErrorMatchingSnapshot()

    expect(d.entry(["hello", "world"]).get()).toBe(4)

    expect(() => d.entry(["bla"])).toThrowErrorMatchingSnapshot()

    d.entry(["coffee", "tea"]).set(100)

    const e3 = d.entry(["hello", "universe"])
    e3.set(42)
    expect(e3.exists()).toBe(true)
    expect(e3.get()).toBe(42)

    expect(d.entry(["hello", "world"]).get()).toBe(4)
    expect(d.entry(["hello", "universe"]).get()).toBe(42)
    expect(d.entry(["coffee", "tea"]).get()).toBe(100)

    d.entry(["hello", "world"]).delete()
    expect(d.entry(["hello", "world"]).exists()).toBe(false)
    expect(d.entry(["hello", "universe"]).get()).toBe(42)

    d.entry(["coffee", "tea"]).delete()
    expect((d as any).store.size).toBe(1)

    expect(d.entry(["hello", "universe"]).get()).toBe(42)
    d.entry(["hello", "universe"]).delete()
    expect((d as any).store.size).toBe(0)
})

test("really deep", () => {
    const d = new DeepMap<number>()
    const path = ["a", "b", "c", "d", "e"]
    expect(d.entry(path).exists()).toBe(false)
    d.entry(path).set(3)
    expect(d.entry(path).exists()).toBe(true)
    expect(d.entry(path).get()).toBe(3)
    d.entry(path).set(4)
    expect(d.entry(path).get()).toBe(4)

    d.entry(path).delete()
    expect((d as any).store.size).toBe(0)
})

test("really shallow", () => {
    const d = new DeepMap<number>()
    const path = []
    expect(d.entry(path).exists()).toBe(false)
    d.entry(path).set(3)
    expect(d.entry(path).exists()).toBe(true)
    expect(d.entry(path).get()).toBe(3)
    d.entry(path).set(4)
    expect(d.entry(path).get()).toBe(4)

    d.entry(path).delete()
    expect((d as any).store.size).toBe(0)
})
