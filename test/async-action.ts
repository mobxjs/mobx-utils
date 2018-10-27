import * as utils from "../src/mobx-utils"
import * as mobx from "mobx"

function delay<T>(time: number, value: T, shouldThrow = false): Promise<T> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldThrow) reject(value)
            else resolve(value)
        }, time)
    })
}

test("it should support async generator actions", done => {
    mobx.configure({ enforceActions: "observed" })
    const values: any[] = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = utils.asyncAction(function*(initial: number) {
        x.a = initial // this runs in action
        x.a = yield delay(100, 3) // and this as well!
        yield delay(100, 0)
        x.a = 4
        return x.a
    })

    setTimeout(() => {
        f(2).then((v: number) => {
            // note: ideally, type of v should be inferred..
            expect(v).toBe(4)
            expect(values).toEqual([1, 2, 3, 4])
            done()
        })
    }, 10)
})

test("it should support try catch in async generator", done => {
    mobx.configure({ enforceActions: "observed" })
    const values: any[] = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = utils.asyncAction(function*(initial: number) {
        x.a = initial // this runs in action
        try {
            x.a = yield delay(100, 5, true) // and this as well!
            yield delay(100, 0)
            x.a = 4
        } catch (e) {
            x.a = e
        }
        return x.a
    })

    setTimeout(() => {
        f(2).then((v: number) => {
            // note: ideally, type of v should be inferred..
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            done()
        })
    }, 10)
})

test("it should support throw from async generator", done => {
    utils.asyncAction(function*() {
        throw 7
    })().then(
        () => {
            fail()
            done()
        },
        e => {
            expect(e).toBe(7)
            done()
        }
    )
})

test("it should support throw from yielded promise generator", done => {
    utils.asyncAction(function*() {
        return yield delay(10, 7, true)
    })().then(
        () => {
            fail()
            done()
        },
        e => {
            expect(e).toBe(7)
            done()
        }
    )
})

test("it should support asyncAction as decorator", done => {
    const values: any[] = []

    mobx.configure({ enforceActions: "observed" })

    class X {
        @mobx.observable a = 1;

        @utils.asyncAction
        *f(initial: number) {
            this.a = initial // this runs in action
            try {
                this.a = yield delay(100, 5, true) // and this as well!
                yield delay(100, 0)
                this.a = 4
            } catch (e) {
                this.a = e
            }
            return this.a
        }
    }

    const x = new X()
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    setTimeout(() => {
        // TODO: mweh on any cast...
        ;(x.f(/*test binding*/ 2) as any).then((v: number) => {
            // note: ideally, type of v should be inferred..
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            expect(x.a).toBe(5) // correct instance modified?
            done()
        })
    }, 10)
})

test("it should support logging", done => {
    mobx.configure({ enforceActions: "observed" })
    const events: any[] = []
    const x = mobx.observable({ a: 1 })

    const f = utils.asyncAction(function* myaction(initial: number) {
        x.a = initial
        x.a = yield delay(100, 5)
        x.a = 4
        x.a = yield delay(100, 3)
        return x.a
    })
    const d = mobx.spy(ev => events.push(ev))

    setTimeout(() => {
        f(2).then(() => {
            expect(stripEvents(events)).toMatchSnapshot()
            d()
            done()
        })
    }, 10)
})

function stripEvents(events) {
    return events.map(e => {
        delete e.object
        delete e.fn
        delete e.time
        return e
    })
}
