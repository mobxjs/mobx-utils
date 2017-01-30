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
