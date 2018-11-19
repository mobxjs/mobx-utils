"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")
const Rx = require("rxjs")

test("to observable - should push the initial value by default", () => {
    const user = mobx.observable({
        firstName: "C.S",
        lastName: "Lewis"
    })

    mobx.configure({ enforceActions: "never" })

    let values = []

    const sub = Rx.Observable
        .from(utils.toStream(() => user.firstName + user.lastName, true))
        .map(x => x.toUpperCase())
        .subscribe(v => values.push(v))

    user.firstName = "John"

    mobx.runInAction(() => {
        user.firstName = "Jane"
        user.lastName = "Jack"
    })

    sub.unsubscribe()

    user.firstName = "error"

    expect(values).toEqual(["C.SLEWIS", "JOHNLEWIS", "JANEJACK"])
})

test("to observable - should not push the initial value", () => {
    const user = mobx.observable({
        firstName: "C.S",
        lastName: "Lewis"
    })

    mobx.configure({ enforceActions: "never" })

    let values = []

    const sub = Rx.Observable
        .from(utils.toStream(() => user.firstName + user.lastName))
        .map(x => x.toUpperCase())
        .subscribe(v => values.push(v))

    user.firstName = "John"

    mobx.runInAction(() => {
        user.firstName = "Jane"
        user.lastName = "Jack"
    })

    sub.unsubscribe()

    user.firstName = "error"

    expect(values).toEqual(["JOHNLEWIS", "JANEJACK"])
})

test("from observable", done => {
    mobx.configure({ enforceActions: "observed" })
    const fromStream = utils.fromStream(Rx.Observable.interval(100), -1)
    const values = []
    const d = mobx.autorun(() => {
        values.push(fromStream.current)
    })

    setTimeout(() => {
        expect(fromStream.current).toBe(-1)
    }, 50)
    setTimeout(() => {
        expect(fromStream.current).toBe(0)
    }, 150)
    setTimeout(() => {
        expect(fromStream.current).toBe(1)
        fromStream.dispose()
    }, 250)
    setTimeout(() => {
        expect(fromStream.current).toBe(1)
        expect(values).toEqual([-1, 0, 1])
        d()
        mobx.configure({ enforceActions: "never" })
        done()
    }, 350)
})
