"use strict";

const utils = require("../");
const mobx = require("mobx");
const test = require("tape");

mobx.useStrict(true);

test("test from-promise", t => {
    test("resolves", t => {
        const p = new Promise((resolve, reject) => {
            debugger;
            resolve(7);
        })

        const obs = utils.fromPromise(p, 3);
        t.equal(obs.value, 3)
        t.equal(obs.state, "pending")
        t.equal(obs.reason, undefined)
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
        const p = new Promise((resolve, reject) => {
            resolve(7)
        })

        const obs = utils.fromPromise(p, 3);
        t.equal(obs.value, 3)
        t.equal(obs.state, "pending")
        t.equal(obs.reason, undefined)
        t.ok(obs.promise === p)

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

        const obs = utils.fromPromise(p, 3);
        t.equal(obs.value, 3)
        t.equal(obs.state, "pending")
        t.equal(obs.reason, undefined)
        t.ok(obs.promise === p)

        mobx.when(
            () => obs.state !== utils.PENDING,
            () => {
                t.equal(obs.state, utils.REJECTED)
                t.equal(obs.value, 7)
                t.equal(obs.reason, 7)
                t.end()
            }
        )
    })

    test("rejects when throwing", t => {
        const p = new Promise((resolve, reject) => {
            throw 7
        })

        const obs = utils.fromPromise(p, 3);
        t.equal(obs.value, 3)
        t.equal(obs.state, "pending")
        t.equal(obs.reason, undefined)
        t.ok(obs.promise === p)

        mobx.when(
            () => obs.state !== "pending",
            () => {
                t.equal(obs.state, "rejected")
                t.equal(obs.value, 7)
                t.equal(obs.reason, 7)
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

        let mapping = {pending: () => 1}

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

    t.end()
})

