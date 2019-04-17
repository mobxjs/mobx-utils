import { DeepMap } from "../src/deepMap"

test("args length 2", () => {
    const d = new DeepMap<number>()

    const e = d.get(["hello", "world"])

    expect(e.exists()).toBe(false)

    expect(() => {
        e.get()
    }).toThrowErrorMatchingSnapshot()

    e.set(3)

    expect(e.get()).toBe(3)
    expect(e.exists()).toBe(true)

    const e2 = d.get(["hello", "world"])
    expect(e2.exists()).toBe(true)
    expect(e2.get()).toBe(3)

    e2.set(4)
    expect(() => {
        e.get()
    }).toThrowErrorMatchingSnapshot()

    expect(d.get(["hello", "world"]).get()).toBe(4)

    expect(() => d.get(["bla"])).toThrowErrorMatchingSnapshot()

    d.get(["coffee", "tea"]).set(100)

    const e3 = d.get(["hello", "universe"])
    e3.set(42)
    expect(e3.exists()).toBe(true)
    expect(e3.get()).toBe(42)

    expect(d.get(["hello", "world"]).get()).toBe(4)
    expect(d.get(["hello", "universe"]).get()).toBe(42)
    expect(d.get(["coffee", "tea"]).get()).toBe(100)

    d.get(["hello", "world"]).delete()
    expect(d.get(["hello", "world"]).exists()).toBe(false)
    expect(d.get(["hello", "universe"]).get()).toBe(42)
    
    d.get(["coffee", "tea"]).delete()
    expect((d as any).store.size).toBe(1)

    expect(d.get(["hello", "universe"]).get()).toBe(42)
    d.get(["hello", "universe"]).delete()
    expect((d as any).store.size).toBe(0)
})

test("really deep", () => {
  const d = new DeepMap<number>()
  const path = ["a", "b", "c", "d", "e"]
  expect(d.get(path).exists()).toBe(false)
  d.get(path).set(3)
  expect(d.get(path).exists()).toBe(true)
  expect(d.get(path).get()).toBe(3)
  d.get(path).set(4)
  expect(d.get(path).get()).toBe(4)

  d.get(path).delete()
  expect((d as any).store.size).toBe(0)
})

test("really shallow", () => {
  const d = new DeepMap<number>()
  const path = []
  expect(d.get(path).exists()).toBe(false)
  d.get(path).set(3)
  expect(d.get(path).exists()).toBe(true)
  expect(d.get(path).get()).toBe(3)
  d.get(path).set(4)
  expect(d.get(path).get()).toBe(4)

  d.get(path).delete()
  expect((d as any).store.size).toBe(0)
})
