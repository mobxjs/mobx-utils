'use strict';

const utils = require('../');
const mobx = require('mobx');
const test = require('tape');

test('now should tick', t => {
    const values = []
    const d = mobx.autorun(() => {
        utils.now(100)
        utils.now(100) // make sure same ticker is used!
        values.push("x")
    })

    setTimeout(d, 250)

    setTimeout(() => {
        t.deepEqual(values, ["x", "x", "x"])
        t.end()
    }, 500)
})

test('now should be up to date outside reaction, #40', t => {
    const d1 = utils.now(1000);
    t.true(typeof d1 === "number");
    setTimeout(() => {
        const d2 = utils.now(1000);
        t.true(typeof d2 === "number");
        t.notEqual(d1, d2);
        t.true((d2 - d1) > 400);
        t.end();
    }, 500)
})