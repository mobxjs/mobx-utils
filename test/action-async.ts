import * as mobx from "mobx"
import { actionAsync, task } from "../src/mobx-utils"

function delay<T>(time: number, value: T) {
    return new Promise<T>(resolve => {
        setTimeout(() => {
            resolve(value)
        }, time)
    })
}

function delayThrow<T>(time: number, value: T) {
    return new Promise<T>((_, reject) => {
        setTimeout(() => {
            reject(value)
        }, time)
    })
}

test("it should support async actions", done => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = actionAsync(async function(initial) {
        x.a = initial // this runs in action
        x.a = await task(delay(100, 3))
        await task(delay(100, 0))
        x.a = 4
        return x.a
    })

    setTimeout(() => {
        f(2).then(v => {
            expect(v).toBe(4)
            expect(values).toEqual([1, 2, 3, 4])
            done()
        })
    }, 10)
})

test("it should support try catch in async", done => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = actionAsync(async function(initial) {
        x.a = initial // this runs in action
        try {
            x.a = await task(delayThrow(100, 5))
            await task(delay(100, 0))
            x.a = 4
        } catch (e) {
            x.a = e
        }
        return x.a
    })

    setTimeout(() => {
        f(2).then(v => {
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            done()
        })
    }, 10)
})

test("it should support throw from async actions", done => {
    actionAsync(async function() {
        await task(delay(10, 7))
        throw 7
    })().then(
        () => {
            done.fail("should fail")
        },
        e => {
            expect(e).toBe(7)
            done()
        }
    )
})

test("it should support throw from awaited promise", done => {
    actionAsync(async function() {
        return await task(delayThrow(10, 7))
    })().then(
        () => {
            done.fail("should fail")
        },
        e => {
            expect(e).toBe(7)
            done()
        }
    )
})

test("it should support async action in classes", done => {
    const values = []

    mobx.configure({ enforceActions: "observed" })

    class X {
        a = 1

        f = actionAsync(async function(initial) {
            this.a = initial // this runs in action
            try {
                this.a = await task(delayThrow(100, 5))
                await task(delay(100, 0))
                this.a = 4
            } catch (e) {
                this.a = e
            }
            return this.a
        })
    }
    mobx.decorate(X, {
        a: mobx.observable
    })

    const x = new X()
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    setTimeout(() => {
        x.f(2).then(v => {
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            expect(x.a).toBe(5)
            done()
        })
    }, 10)
})

test("it should support async action in classes with a method decorator", done => {
    const values = []

    mobx.configure({ enforceActions: "observed" })

    class X {
        @mobx.observable a = 1

        @actionAsync
        async f(initial) {
            this.a = initial // this runs in action
            try {
                this.a = await task(delayThrow(100, 5))
                await task(delay(100, 0))
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
        x.f(2).then(v => {
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            expect(x.a).toBe(5)
            done()
        })
    }, 10)
})

test("it should support async action in classes with a field decorator", done => {
    const values = []

    mobx.configure({ enforceActions: "observed" })

    class X {
        @mobx.observable a = 1

        @actionAsync
        f = async initial => {
            this.a = initial // this runs in action
            try {
                this.a = await task(delayThrow(100, 5))
                await task(delay(100, 0))
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
        x.f(2).then(v => {
            expect(v).toBe(5)
            expect(values).toEqual([1, 2, 5])
            expect(x.a).toBe(5)
            done()
        })
    }, 10)
})

test("it should support logging", done => {
    mobx.configure({ enforceActions: "observed" })
    const events = []
    const x = mobx.observable({ a: 1 })

    const f = actionAsync(async function myaction(initial) {
        x.a = initial
        x.a = await task(delay(100, 5))
        x.a = 4
        x.a = await task(delay(100, 3))
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

test("it should support async actions within async actions", done => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const innerF = actionAsync(async function(initial) {
        x.a = initial // this runs in action
        x.a = await task(delay(100, 3))
        await task(delay(100, 0))
        x.a = 4
        return x.a
    })

    const f1 = actionAsync(async function(initial) {
        x.a = await task(innerF(initial))
        x.a = await task(delay(100, 5))
        await task(delay(100, 0))
        x.a = 6
        return x.a
    })

    setTimeout(() => {
        f1(2).then(v => {
            expect(v).toBe(6)
            expect(values).toEqual([1, 2, 3, 4, 5, 6])
            done()
        })
    }, 10)
})

test("it should support async actions within async actions that throw", done => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const innerF = actionAsync(async function(initial) {
        x.a = initial // this runs in action
        x.a = await task(delay(100, 3))
        await task(delay(100, 0))
        x.a = 4
        throw "err"
    })

    const f = actionAsync(async function(initial) {
        x.a = await task(innerF(initial))
        x.a = await task(delay(100, 5))
        await task(delay(100, 0))
        x.a = 6
        return x.a
    })

    setTimeout(() => {
        f(2).then(
            () => {
                done.fail("should fail")
            },
            e => {
                expect(e).toBe("err")
                done()
            }
        )
    }, 10)
})

test("typing", async () => {
    const nothingAsync = async () => {
        return [5]
    }

    const f = actionAsync(async (_initial: number) => {
        const _n: number[] = await task(nothingAsync())
        expect(_n).toEqual([5])
        return "string"
    })

    const n: string = await f(5)
})
