"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

mobx.configure({ enforceActions: "observed" })

test("resolves", done => {
    const p = new Promise(resolve => resolve(7))

    const obs = utils.fromPromise(p)
    expect(obs.value).toBe(undefined)
    expect(obs.state).toBe("pending")

    mobx.when(
        () => {
            return obs.state === "fulfilled"
        },
        () => {
            expect(obs.value).toBe(7)
            done()
        }
    )
})

test("old state is undefined", done => {
    const p = new Promise(resolve => resolve(7))
    const obs = utils.fromPromise(p, undefined)
    expect(obs.value).toBe(undefined)
    expect(obs.state).toBe("pending")

    mobx.when(
        () => obs.state === "fulfilled",
        () => {
            expect(obs.value).toBe(7)
            done()
        }
    )
})

test("resolves old state", done => {
    const oldP = utils.fromPromise(new Promise(resolve => resolve(9)))
    mobx.when(
        () => oldP.state == "fulfilled",
        () => {
            const p = new Promise(resolve => resolve(7))
            const obs = utils.fromPromise(p, oldP)
            expect(obs.value).toBe(9)
            expect(obs.state).toBe("pending")
            done()
        }
    )
})

test("resolves new state", done => {
    const oldP = utils.fromPromise(new Promise(resolve => resolve(9)))
    mobx.when(
        () => oldP.state == "fulfilled",
        () => {
            const p = new Promise(resolve => resolve(7))
            const obs = utils.fromPromise(p, oldP)
            mobx.when(
                () => obs.state === "fulfilled",
                () => {
                    expect(obs.value).toBe(7)
                    done()
                }
            )
        }
    )
})

test("rejects new state", done => {
    const oldP = utils.fromPromise(new Promise(resolve => resolve(9)))
    mobx.when(
        () => oldP.state == "fulfilled",
        () => {
            const p = new Promise((resolve, reject) => {
                reject(7)
            })
            const obs = utils.fromPromise(p, oldP)
            mobx.when(
                () => obs.state === "rejected",
                () => {
                    expect(obs.value).toBe(7)
                    done()
                }
            )
        }
    )
})

test("resolves value", done => {
    const p = new Promise(resolve => resolve(7))

    const obs = utils.fromPromise(p)
    expect(obs.value).toBe(undefined)
    expect(obs.state).toBe("pending")

    mobx.when(
        () => obs.value === 7,
        () => {
            expect(obs.state).toBe(utils.FULFILLED)
            done()
        }
    )
})

test("resolves value from promise function", done => {
    const obs = utils.fromPromise(resolve => resolve(7))
    expect(obs.value).toBe(undefined)
    expect(obs.state).toBe("pending")

    mobx.when(
        () => obs.value === 7,
        () => {
            expect(obs.state).toBe(utils.FULFILLED)
            done()
        }
    )
})

test("rejects with reason value", done => {
    const p = new Promise((resolve, reject) => {
        reject(7)
    })

    p.catch(() => {
        /* noop */
    })

    const obs = utils.fromPromise(p)
    expect(obs.value).toBe(undefined)
    expect(obs.state).toBe("pending")

    mobx.when(
        () => obs.state !== utils.PENDING,
        () => {
            expect(obs.state).toBe(utils.REJECTED)
            expect(obs.value).toBe(7)
            done()
        }
    )
})

test("rejects with reason value from fn", done => {
    const obs = utils.fromPromise(
        new Promise((resolve, reject) => {
            reject(undefined)
        })
    )
    obs.catch(() => {})
    expect(obs.value).toBe(undefined)
    expect(obs.state).toBe("pending")

    mobx.when(
        () => obs.state !== utils.PENDING,
        () => {
            expect(obs.state).toBe(utils.REJECTED)
            expect(obs.value).toBe(undefined)
            done()
        }
    )
})

test("rejects when throwing", done => {
    const p = new Promise(() => {
        throw 7
    })
    p.catch(() => {})

    const obs = utils.fromPromise(p)
    expect(obs.value).toBe(undefined)
    expect(obs.state).toBe("pending")

    mobx.when(
        () => obs.state !== "pending",
        () => {
            expect(obs.state).toBe("rejected")
            expect(obs.value).toBe(7)
            done()
        }
    )
})

test("case method, fulfillment", done => {
    const p = Promise.resolve()
    const obs = utils.fromPromise(p)

    let mapping = {
        pending: () => 1,
        fulfilled: x => 2,
        rejected: y => 3
    }

    let mapped = obs.case(mapping)
    expect(mapped).toBe(1)
    mobx.when(
        () => obs.state !== "pending",
        () => {
            let mapped = obs.case(mapping)
            expect(mapped).toBe(2)
            done()
        }
    )
})

test("case method, rejection", done => {
    const p = Promise.reject()
    p.then(
        () => {},
        () => {
            expect(true).toBe(true)
        }
    )
    const obs = utils.fromPromise(p)

    let mapping = {
        pending: () => 1,
        fulfilled: x => 2,
        rejected: y => 3
    }

    let mapped = obs.case(mapping)
    expect(mapped).toBe(1)
    mobx.when(
        () => obs.state !== "pending",
        () => {
            let mapped = obs.case(mapping)
            expect(mapped).toBe(3)
            done()
        }
    )
})

test("case method, returns undefined when handler is missing", done => {
    const p = Promise.resolve()
    const obs = utils.fromPromise(p)

    let mapping = { pending: () => 1 }

    let mapped = obs.case(mapping)
    expect(mapped).toBe(1)
    mobx.when(
        () => obs.state !== "pending",
        () => {
            let mapped = obs.case(mapping)
            expect(mapped).toBe(undefined)
            done()
        }
    )
})

test("isPromiseBasedObservable, true", () => {
    const obs = utils.fromPromise(Promise.resolve(123))
    expect(utils.isPromiseBasedObservable(obs)).toBeTruthy()
})

test("isPromiseBasedObservable, false", () => {
    expect(utils.isPromiseBasedObservable({})).toBeFalsy()
})

test("state and value are observable, #56", () => {
    const obs = utils.fromPromise(Promise.resolve(123))
    expect(mobx.isObservable(obs)).toBeTruthy()
    expect(mobx.isObservableProp(obs, "state")).toBeTruthy()
    expect(mobx.isObservableProp(obs, "value")).toBeTruthy()
})

test("the resolved value of a promise is not convertd to some deep observable, #54", done => {
    const someObject = { a: 3 }
    const obs = utils.fromPromise(Promise.resolve(someObject))
    obs.then(v => {
        expect(obs.state).toBe(utils.FULFILLED)
        expect(mobx.isObservable(obs.value)).toBeFalsy()
        expect(obs.value === someObject).toBeTruthy()
        expect(v === someObject).toBeTruthy()
        done()
    })
})

test("it is possible to create a promise in a rejected state, #36", done => {
    const someObject = { a: 3 }
    const obs = utils.fromPromise.reject(someObject)
    expect(obs.state).toBe(utils.REJECTED)
    expect(obs.value).toBe(someObject)

    // still a real promise backing it, which can be thenned...
    obs.catch(v => {
        expect(obs.state).toBe(utils.REJECTED)
        expect(mobx.isObservable(obs.value)).toBeFalsy()
        expect(obs.value === someObject).toBeTruthy()
        expect(v === someObject).toBeTruthy()
        done()
    })
})

test("it is possible to create a promise in a fullfilled state, #36", done => {
    const someObject = { a: 3 }
    const obs = utils.fromPromise.resolve(someObject)
    expect(obs.state).toBe(utils.FULFILLED)
    expect(obs.value).toBe(someObject)

    // still a real promise backing it, which can be thenned...
    obs.then(v => {
        expect(obs.state).toBe(utils.FULFILLED)
        expect(mobx.isObservable(obs.value)).toBeFalsy()
        expect(obs.value === someObject).toBeTruthy()
        expect(v === someObject).toBeTruthy()
        done()
    })
})

test("when creating a promise in a fullfilled state it should not fire twice, #36", done => {
    let events = 0
    const obs = utils.fromPromise.resolve(3)

    mobx.autorun(() => {
        obs.state // track state & value
        obs.value
        events++
    })

    obs.then(v => {
        expect(events).toBe(1) // only initial run should have run
        done()
    })
})

test("it creates a real promise, #45", () => {
    return Promise.all([
        utils.fromPromise.resolve(2),
        utils.fromPromise(Promise.resolve(3))
    ]).then(x => {
        expect(x).toEqual([2, 3])
    })
})

test("it can construct new promises from function, #45", () => {
    return Promise.all([
        utils.fromPromise((resolve, reject) => {
            setTimeout(() => resolve(2), 200)
        }),
        utils.fromPromise(Promise.resolve(3))
    ]).then(x => {
        expect(x).toEqual([2, 3])
    })
})

test("it can construct a fromPromise from a fromPromise, #119", () => {
    expect(() => {
        utils.fromPromise(utils.fromPromise(Promise.resolve(3)))
    }).not.toThrow()
})
