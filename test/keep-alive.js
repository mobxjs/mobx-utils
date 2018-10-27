"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

mobx.configure({ enforceActions: "observed" })

test("keep alive should work for computeds", () => {
    const a = mobx.observable.box(1)
    let calcs = 0
    const doubler = mobx.computed(() => {
        calcs++
        return a.get() * 2
    })

    doubler.get()
    doubler.get()
    expect(calcs).toBe(2)

    mobx.runInAction(() => a.set(2))
    expect(calcs).toBe(2)

    const disposer = utils.keepAlive(doubler)
    expect(doubler.get()).toBe(4)
    doubler.get()
    expect(calcs).toBe(3)

    mobx.runInAction(() => a.set(4))
    expect(calcs).toBe(4)

    expect(doubler.get()).toBe(8)
    doubler.get()

    expect(calcs).toBe(4)

    disposer()

    doubler.get()
    doubler.get()

    expect(calcs).toBe(6)
})

test("keep alive should work for properties", () => {
    let calcs = 0
    const x = mobx.observable({
        a: 1,
        get doubler() {
            calcs++
            return this.a * 2
        }
    })

    x.doubler
    x.doubler
    expect(calcs).toBe(2)

    mobx.runInAction(() => (x.a = 2))
    expect(calcs).toBe(2)

    const disposer = utils.keepAlive(x, "doubler")
    x.doubler
    expect(x.doubler).toBe(4)
    expect(calcs).toBe(3)

    mobx.runInAction(() => (x.a = 4))
    expect(calcs).toBe(4)

    expect(x.doubler).toBe(8)
    x.doubler

    expect(calcs).toBe(4)

    disposer()

    x.doubler
    x.doubler

    expect(calcs).toBe(6)
})
