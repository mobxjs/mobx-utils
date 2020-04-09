import * as utils from "../src/mobx-utils"
import * as mobx from "mobx"
import { from, interval } from "rxjs"
import { map } from "rxjs/operators"

test("to observable - should push the initial value by default", () => {
    const user = mobx.observable({
        firstName: "C.S",
        lastName: "Lewis"
    })

    mobx.configure({ enforceActions: "never" })

    let values: string[] = []

    const sub = from(utils.toStream(() => user.firstName + user.lastName, true))
        .pipe(map(x => x.toUpperCase()))
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

    let values: string[] = []

    const sub = from(utils.toStream(() => user.firstName + user.lastName))
        .pipe(map(x => x.toUpperCase()))
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
    const fromStream = utils.fromStream(interval(10), -1)
    const values: number[] = []
    const d = mobx.autorun(() => {
        values.push(fromStream.current)
    })

    setTimeout(() => {
        expect(fromStream.current).toBe(-1)
    }, 5)
    setTimeout(() => {
        expect(fromStream.current).toBe(0)
    }, 15)
    setTimeout(() => {
        expect(fromStream.current).toBe(1)
        fromStream.dispose()
    }, 25)
    setTimeout(() => {
        expect(fromStream.current).toBe(1)
        expect(values).toEqual([-1, 0, 1])
        d()
        mobx.configure({ enforceActions: "never" })
        done()
    }, 35)
})
