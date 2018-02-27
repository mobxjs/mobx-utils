"use strict"

const utils = require("../")
const mobx = require("mobx")
const test = require("tape")

mobx.useStrict(true)

test("test from-promise", t => {
    test("resolves", t => {
        const p = new Promise(resolve => resolve(7))

        const obs = utils.fromPromise(p)
        t.equal(obs.value, undefined)
        t.equal(obs.state, "pending")
        t.ok(obs.promise === p)

        mobx.when(
            () => {
                return obs.state === "fulfilled"
            },
            () => {
                t.equal(obs.value, 7)
                t.end()
            }
        )
    })

    test("resolves value", t => {
        const p = new Promise(resolve => resolve(7))

        const obs = utils.fromPromise(p)
        t.equal(obs.value, undefined)
        t.equal(obs.state, "pending")
        t.ok(obs.promise === p)

        mobx.when(
            () => obs.value === 7,
            () => {
                t.equal(obs.state, utils.FULFILLED)
                t.end()
            }
        )
    })

    test("resolves value from promise function", t => {
        const obs = utils.fromPromise(resolve => resolve(7))
        t.equal(obs.value, undefined)
        t.equal(obs.state, "pending")

        mobx.when(
            () => obs.value === 7,
            () => {
                t.equal(obs.state, utils.FULFILLED)
                t.end()
            }
        )
    })

    test("rejects with reason value", t => {
        const p = new Promise((resolve, reject) => {
            reject(7)
        })

        const obs = utils.fromPromise(p)
        t.equal(obs.value, undefined)
        t.equal(obs.state, "pending")
        t.ok(obs.promise === p)

        mobx.when(
            () => obs.state !== utils.PENDING,
            () => {
                t.equal(obs.state, utils.REJECTED)
                t.equal(obs.value, 7)
                t.end()
            }
        )
    })

    test("rejects with reason value from fn", t => {
        const obs = utils.fromPromise((resolve, reject) => {
            reject(7)
        })
        t.equal(obs.value, undefined)
        t.equal(obs.state, "pending")

        mobx.when(
            () => obs.state !== utils.PENDING,
            () => {
                t.equal(obs.state, utils.REJECTED)
                t.equal(obs.value, 7)
                t.end()
            }
        )
    })

    test("rejects when throwing", t => {
        const p = new Promise(() => {
            throw 7
        })

        const obs = utils.fromPromise(p)
        t.equal(obs.value, undefined)
        t.equal(obs.state, "pending")
        t.ok(obs.promise === p)

        mobx.when(
            () => obs.state !== "pending",
            () => {
                t.equal(obs.state, "rejected")
                t.equal(obs.value, 7)
                t.end()
            }
        )
    })

    test("case method, fulfillment", t => {
        const p = Promise.resolve()
        const obs = utils.fromPromise(p)

        let mapping = {
            pending: () => 1,
            fulfilled: x => 2,
            rejected: y => 3
        }

        let mapped = obs.case(mapping)
        t.equal(mapped, 1)
        mobx.when(
            () => obs.state !== "pending",
            () => {
                let mapped = obs.case(mapping)
                t.equal(mapped, 2)
                t.end()
            }
        )
    })

    test("case method, rejection", t => {
        const p = Promise.reject()
        const obs = utils.fromPromise(p)

        let mapping = {
            pending: () => 1,
            fulfilled: x => 2,
            rejected: y => 3
        }

        let mapped = obs.case(mapping)
        t.equal(mapped, 1)
        mobx.when(
            () => obs.state !== "pending",
            () => {
                let mapped = obs.case(mapping)
                t.equal(mapped, 3)
                t.end()
            }
        )
    })

    test("case method, returns undefined when handler is missing", t => {
        const p = Promise.resolve()
        const obs = utils.fromPromise(p)

        let mapping = { pending: () => 1 }

        let mapped = obs.case(mapping)
        t.equal(mapped, 1)
        mobx.when(
            () => obs.state !== "pending",
            () => {
                let mapped = obs.case(mapping)
                t.equal(mapped, undefined)
                t.end()
            }
        )
    })

    test("isPromiseBasedObservable, true", t => {
        const obs = utils.fromPromise(Promise.resolve(123))
        t.ok(utils.isPromiseBasedObservable(obs))
        t.end()
    })

    test("isPromiseBasedObservable, false", t => {
        t.notOk(utils.isPromiseBasedObservable({}))
        t.end()
    })

    test("state and value are observable, #56", t => {
        const obs = utils.fromPromise(Promise.resolve(123))
        t.ok(mobx.isObservable(obs))
        t.ok(mobx.isObservableProp(obs, "state"))
        t.ok(mobx.isObservableProp(obs, "value"))
        t.end()
    })

    test("the resolved value of a promise is not convertd to some deep observable, #54", t => {
        const someObject = { a: 3 }
        const obs = utils.fromPromise(Promise.resolve(someObject))
        obs.promise.then(v => {
            t.is(obs.state, utils.FULFILLED)
            t.false(mobx.isObservable(obs.value))
            t.true(obs.value === someObject)
            t.true(v === someObject)
            t.end()
        })
    })

    test("it is possible to create a promise in a rejected state, #36", t => {
        const someObject = { a: 3 }
        const obs = utils.fromPromise.reject(someObject)
        t.is(obs.state, utils.REJECTED)
        t.is(obs.value, someObject)

        // still a real promise backing it, which can be thenned...
        obs.promise.catch(v => {
            t.is(obs.state, utils.REJECTED)
            t.false(mobx.isObservable(obs.value))
            t.true(obs.value === someObject)
            t.true(v === someObject)
            t.end()
        })
    })

    test("it is possible to create a promise in a fullfilled state, #36", t => {
        const someObject = { a: 3 }
        const obs = utils.fromPromise.resolve(someObject)
        t.is(obs.state, utils.FULFILLED)
        t.is(obs.value, someObject)

        // still a real promise backing it, which can be thenned...
        obs.promise.then(v => {
            t.is(obs.state, utils.FULFILLED)
            t.false(mobx.isObservable(obs.value))
            t.true(obs.value === someObject)
            t.true(v === someObject)
            t.end()
        })
    })

    test("when creating a promise in a fullfilled state it should not fire twice, #36", t => {
        let events = 0
        const obs = utils.fromPromise.resolve(3)

        mobx.autorun(() => {
            obs.state // track state & value
            obs.value
            events++
        })

        obs.promise.then(v => {
            t.is(events, 1) // only initial run should have run
            t.end()
        })
    })

    test("it creates a real promise, #45", t => {
        Promise.all([
            utils.fromPromise.resolve(2),
            utils.fromPromise(Promise.resolve(3))
        ]).then(x => {
            t.deepEqual(x, [2, 3])
            t.end()
        })
    })

    test("it can construct new promises from function, #45", t => {
        Promise.all([
            utils.fromPromise((resolve, reject) => {
                setTimeout(() => resolve(2), 200)
            }),
            utils.fromPromise(Promise.resolve(3))
        ]).then(x => {
            t.deepEqual(x, [2, 3])
            t.end()
        })
    })

    t.end()
})
