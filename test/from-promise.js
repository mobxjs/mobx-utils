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
                t.equal(obs.state, "fulfilled")
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
            () => obs.state !== "pending",
            () => {
                t.equal(obs.state, "rejected")
                t.equal(obs.value, 3)
                t.equal(obs.reason, 7)
                t.end()
            }
        )
    })

    t.end()
})

