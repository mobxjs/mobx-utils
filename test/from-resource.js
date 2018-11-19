"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

mobx.configure({ enforceActions: "observed" })

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

test("basics", () => {
    let base = console.warn // eslint-disable-line no-console
    let warn = []
    console.warn = msg => warn.push(msg) // eslint-disable-line no-console

    var me = new Record("michel")
    var me$ = createObservable(me)
    expect(me.subscriptions.length).toBe(0)

    var currentName
    var calcs = 0
    var disposer = mobx.autorun(() => {
        calcs++
        currentName = me$.current().name
    })

    expect(me.subscriptions.length).toBe(1)
    expect(currentName).toBe("michel")
    me.updateName("veria")
    expect(currentName).toBe("veria")
    me.updateName("elise")
    expect(currentName).toBe("elise")
    expect(calcs).toBe(3)

    disposer()
    expect(me.subscriptions.length).toBe(0)

    me.updateName("noa")
    expect(currentName).toBe("elise")
    expect(calcs).toBe(3)

    // test warning
    expect(me$.current().name).toBe("noa") // happens to be visible through the data reference, but no autorun tragger
    expect(warn).toEqual([
        "Called `get` of a subscribingObservable outside a reaction. Current value will be returned but no new subscription has started"
    ])

    // resubscribe
    disposer = mobx.autorun(() => {
        calcs++
        currentName = me$.current().name
    })

    expect(currentName).toBe("noa")
    expect(calcs).toBe(4)

    setTimeout(() => {
        expect(me.subscriptions.length).toBe(1)
        me.updateName("jan")
        expect(calcs).toBe(5)

        me$.dispose()
        expect(me.subscriptions.length).toBe(0)
        expect(() => me$.current()).toThrow()

        me.updateName("john")
        expect(calcs).toBe(5)
        expect(currentName).toBe("jan")

        disposer() // autorun

        expect(warn.length).toBe(1)
        console.warn = base // eslint-disable-line no-console
        done()
    }, 100)
})

test("from computed, #32", () => {
    var you = new Record("You")
    var you$ = createObservable(you)

    var computedName = mobx.computed(() => you$.current().name.toUpperCase())
    var name
    var d = mobx.autorun(() => (name = computedName.get()))
    expect(name).toBe("YOU")
    you.updateName("Me")
    expect(name).toBe("ME")
    d()
    you.updateName("Hi")
    expect(name).toBe("ME")
})
