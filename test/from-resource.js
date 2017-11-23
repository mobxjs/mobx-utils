"use strict"

const utils = require("../")
const mobx = require("mobx")
const test = require("tape")

mobx.useStrict(true)

test("test from-resource", t => {
    function Record(name) {
        this.data = { name: name }
        this.subscriptions = []
    }
    Record.prototype.updateName = function(newName) {
        this.data.name = newName
        this.subscriptions.forEach(f => f())
    }
    Record.prototype.subscribe = function(cb) {
        this.subscriptions.push(cb)
        return () => {
            const idx = this.subscriptions.indexOf(cb)
            if (idx !== -1);
            this.subscriptions.splice(idx, 1)
        }
    }

    function createObservable(record) {
        let subscription
        return utils.fromResource(
            sink => {
                sink(record.data)
                subscription = record.subscribe(() => {
                    sink(record.data)
                })
            },
            () => subscription()
        )
    }

    test("basics", t => {
        let base = console.warn // eslint-disable-line no-console
        let warn = []
        console.warn = msg => warn.push(msg) // eslint-disable-line no-console

        var me = new Record("michel")
        var me$ = createObservable(me)
        t.equal(me.subscriptions.length, 0)

        var currentName
        var calcs = 0
        var disposer = mobx.autorun(() => {
            calcs++
            currentName = me$.current().name
        })

        t.equal(me.subscriptions.length, 1)
        t.equal(currentName, "michel")
        me.updateName("veria")
        t.equal(currentName, "veria")
        me.updateName("elise")
        t.equal(currentName, "elise")
        t.equal(calcs, 3)

        disposer()
        t.equal(me.subscriptions.length, 0)

        me.updateName("noa")
        t.equal(currentName, "elise")
        t.equal(calcs, 3)

        // test warning
        t.equal(me$.current().name, "noa") // happens to be visible through the data reference, but no autorun tragger
        t.deepEqual(warn, [
            "Called `get` of an subscribingObservable outside a reaction. Current value will be returned but no new subscription has started"
        ])

        // resubscribe
        disposer = mobx.autorun(() => {
            calcs++
            currentName = me$.current().name
        })

        t.equal(currentName, "noa")
        t.equal(calcs, 4)

        setTimeout(() => {
            t.equal(me.subscriptions.length, 1)
            me.updateName("jan")
            t.equal(calcs, 5)

            me$.dispose()
            t.equal(me.subscriptions.length, 0)
            t.throws(() => me$.current())

            me.updateName("john")
            t.equal(calcs, 5)
            t.equal(currentName, "jan")

            disposer() // autorun

            t.equal(warn.length, 1)
            console.warn = base // eslint-disable-line no-console
            t.end()
        }, 100)
    })

    test("from computed, #32", t => {
        var you = new Record("You")
        var you$ = createObservable(you)

        var computedName = mobx.computed(() => you$.current().name.toUpperCase())
        var name
        var d = mobx.autorun(() => (name = computedName.get()))
        t.equal(name, "YOU")
        you.updateName("Me")
        t.equal(name, "ME")
        d()
        you.updateName("Hi")
        t.equal(name, "ME")
        t.end()
    })

    t.end()
})
