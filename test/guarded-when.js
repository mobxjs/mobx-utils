"use strict";

const utils = require("../");
const mobx = require("mobx");
const test = require("tape");

test("whenWithTimeout should operate normally", t => {
    var a = mobx.observable(1);

    utils.whenWithTimeout(
        () => a.get() === 2,
        () => t.end(),
        500,
        () => t.fail()
    )

    setTimeout(() => a.set(2), 200)
})

test("whenWithTimeout should timeout", t => {
    const a = mobx.observable(1)

    utils.whenWithTimeout(
        () => a.get() === 2,
        () => t.fail("should have timed out"),
        500,
        () => {
            t.end()
        }
    )

    setTimeout(() => a.set(2), 1000)
})
