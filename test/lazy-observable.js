"use strict";

const utils = require("../");
const mobx = require("mobx");
const test = require("tape");

test("lazy observable should work", t => {
    let started = false;
    const lo = utils.lazyObservable(
        sink => {
            started = true;
            setTimeout(() => sink(4), 50)
            setTimeout(() => sink(5), 100)
            setTimeout(() => sink(6), 150)
        },
        3
    );

    const values = [];
    t.equal(started, false)

    const stop = mobx.autorun(() => {
        values.push(lo.current());
    })

    t.equal(started, true)
    t.deepEqual(values, [3])
    t.equal(lo.current(), 3)

    setTimeout(() => {
        t.equal(lo.current(), 6);
        t.deepEqual(values, [3, 4, 5, 6])
        t.end();
    }, 200)
})
