"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

test("expr", function() {
    mobx.configure({ enforceActions: "never" })
    try {
        let factor = mobx.observable.box(0)
        let price = mobx.observable.box(100)
        let totalCalcs = 0
        let innerCalcs = 0

        let total = mobx.computed(function() {
            totalCalcs += 1 // outer observable shouldn't recalc if inner observable didn't publish a real change
            return (
                price.get() *
                utils.expr(function() {
                    innerCalcs += 1
                    return factor.get() % 2 === 0 ? 1 : 3
                })
            )
        })

        let b = []
        let sub = mobx.observe(
            total,
            function(x) {
                b.push(x.newValue)
            },
            true
        )

        price.set(150)
        factor.set(7) // triggers innerCalc twice, because changing the outcome triggers the outer calculation which recreates the inner calculation
        factor.set(5) // doesn't trigger outer calc
        factor.set(3) // doesn't trigger outer calc
        factor.set(4) // triggers innerCalc twice
        price.set(20)

        expect(b).toEqual([100, 150, 450, 150, 20])
        expect(innerCalcs).toBe(9)
        expect(totalCalcs).toBe(5)
    } finally {
        mobx.configure({ enforceActions: "observed" })
    }
})

test("expr2", function() {
    mobx.configure({ enforceActions: "never" })
    try {
        let factor = mobx.observable.box(0)
        let price = mobx.observable.box(100)
        let totalCalcs = 0
        let innerCalcs = 0

        let total = mobx.computed(function() {
            totalCalcs += 1 // outer observable shouldn't recalc if inner observable didn't publish a real change
            return (
                price.get() *
                utils.expr(function() {
                    innerCalcs += 1
                    return factor.get() % 2 === 0 ? 1 : 3
                })
            )
        })

        let b = []
        let sub = mobx.observe(
            total,
            function(x) {
                b.push(x.newValue)
            },
            true
        )

        price.set(150)
        factor.set(7) // triggers innerCalc twice, because changing the outcome triggers the outer calculation which recreates the inner calculation
        factor.set(5) // doesn't trigger outer calc
        factor.set(3) // doesn't trigger outer calc
        factor.set(4) // triggers innerCalc twice
        price.set(20)

        expect(b).toEqual([100, 150, 450, 150, 20])
        expect(innerCalcs).toBe(9)
        expect(totalCalcs).toBe(5)
    } finally {
        mobx.configure({ enforceActions: "observed" })
    }
})
