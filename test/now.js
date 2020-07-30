"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

test("now should tick", (done) => {
    const values = []
    const d = mobx.autorun(() => {
        utils.now(100)
        utils.now(100) // make sure same ticker is used!
        values.push("x")
    })

    setTimeout(d, 250)

    setTimeout(() => {
        expect(values).toEqual(["x", "x", "x"])
        done()
    }, 500)
})

test("now should be up to date outside reaction, #40", (done) => {
    const d1 = utils.now(1000)
    expect(typeof d1 === "number").toBeTruthy()
    setTimeout(() => {
        const d2 = utils.now(1000)
        expect(typeof d2 === "number").toBeTruthy()
        expect(d1).not.toBe(d2)
        expect(d2 - d1 > 400).toBeTruthy()
        done()
    }, 500)
})

test("now should be up to date when ticker is reactivated, #271", (done) => {
    let d1
    mobx.autorun((r) => {
        d1 = utils.now(100)
        r.dispose()
    })

    let d2
    mobx.autorun(
        (r) => {
            d2 = utils.now(100)
            r.dispose()
        },
        {
            delay: 150,
        }
    )

    setTimeout(() => {
        expect(d1).toBeLessThan(d2)
        done()
    }, 200)
})
