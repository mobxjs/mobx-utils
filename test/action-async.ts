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

function delayFn(time: number, fn: () => void) {
    return new Promise(resolve => {
        setTimeout(() => {
            fn()
            resolve()
        }, time)
    })
}

function expectNoActionsRunning() {
    const obs = mobx.observable.box(1)
    const d = mobx.reaction(() => obs.get(), () => {})
    expect(() => obs.set(2)).toThrow(
        "changing observed observable values outside actions is not allowed"
    )
    d()
}

test("it should support async actions", async () => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = actionAsync(async function(initial) {
        x.a = initial // this runs in action
        x.a = await task(delay(100, 3))
        await task(delay(100, 0))
        x.a = 4
        x.a = await task(5)
        expect(x.a).toBe(5)
        return x.a
    })

    const v = await f(2)
    expect(v).toBe(5)
    expect(values).toEqual([1, 2, 3, 4, 5])
    expectNoActionsRunning()
})

test("it should support try catch in async", async () => {
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

    const v = await f(2)
    expect(v).toBe(5)
    expect(values).toEqual([1, 2, 5])
    expectNoActionsRunning()
})

test("it should support throw from async actions", async () => {
    mobx.configure({ enforceActions: "observed" })
    try {
        await actionAsync(async () => {
            await task(delay(10, 7))
            throw 7
        })()
        fail("should fail")
    } catch (e) {
        expect(e).toBe(7)
    }
    expectNoActionsRunning()
})

test("it should support throw from awaited promise", async () => {
    mobx.configure({ enforceActions: "observed" })
    try {
        await actionAsync(async () => {
            return await task(delayThrow(10, 7))
        })()
        fail("should fail")
    } catch (e) {
        expect(e).toBe(7)
    }
    expectNoActionsRunning()
})

test("it should support async action in classes", async () => {
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

    const v = await x.f(2)
    expect(v).toBe(5)
    expect(values).toEqual([1, 2, 5])
    expect(x.a).toBe(5)
    expectNoActionsRunning()
})

test("it should support async action in classes with a method decorator", async () => {
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

    const v = await x.f(2)
    expect(v).toBe(5)
    expect(values).toEqual([1, 2, 5])
    expect(x.a).toBe(5)
    expectNoActionsRunning()
})

test("it should support async action in classes with a field decorator", async () => {
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

    const v = await x.f(2)
    expect(v).toBe(5)
    expect(values).toEqual([1, 2, 5])
    expect(x.a).toBe(5)
    expectNoActionsRunning()
})

test("it should support logging", async () => {
    mobx.configure({ enforceActions: "observed" })
    const events = []
    const x = mobx.observable({ a: 1 })

    const innerF = actionAsync("innerF", async initial => {
        x.a = initial // this runs in action
        x.a = await task(delay(100, 3))
        x.a = 4
        return x.a
    })

    const f = actionAsync("f", async initial => {
        x.a = initial
        x.a = await task(innerF(2))
        x.a = 5
        x.a = await task(delay(100, 3))
        return x.a
    })
    const d = mobx.spy(ev => events.push(ev))

    await f(1)
    expect(stripEvents(events)).toMatchSnapshot()
    d()
    expectNoActionsRunning()
})

function stripEvents(events) {
    return events.map(e => {
        delete e.object
        delete e.fn
        delete e.time
        return e
    })
}

test("it should support async actions within async actions", async () => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const innerF = actionAsync(async initial => {
        x.a = initial // this runs in action
        x.a = await task(delay(100, 3))
        await task(delay(100, 0))
        x.a = 4
        return x.a
    })

    const f1 = actionAsync(async initial => {
        x.a = await task(innerF(initial))
        x.a = await task(delay(100, 5))
        await task(delay(100, 0))
        x.a = 6
        return x.a
    })

    const v = await f1(2)
    expect(v).toBe(6)
    expect(values).toEqual([1, 2, 3, 4, 5, 6])
    expectNoActionsRunning()
})

test("it should support async actions within async actions that throw", async () => {
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

    try {
        await f(2)
        fail("should fail")
    } catch (e) {
        expect(e).toBe("err")
    }
    expectNoActionsRunning()
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

test("dangling promises created indirectly inside the action should be ok", async () => {
    mobx.configure({ enforceActions: "observed" })
    let danglingP

    const f1 = actionAsync(async () => {
        await task(
            new Promise(resolve => {
                setTimeout(() => {
                    danglingP = delay(100, 1) // indirect dangling promise
                    resolve()
                }, 100)
            })
        )
    })

    await f1()

    expect(danglingP).toBeTruthy()
    await danglingP
    expectNoActionsRunning()
})

test("dangling promises created directly inside the action using task should NOT be ok", async () => {
    mobx.configure({ enforceActions: "observed" })
    let danglingP

    const f1 = actionAsync("f1", async () => {
        danglingP = task(delay(100, 1)) // dangling promise
    })

    try {
        await f1()
        fail("should fail")
    } catch (err) {
        expect(err.message).toBe(
            "[mobx-utils] invalid 'actionAsync' context when finishing action 'f1'. no action context could be found instead. did you await inside an 'actionAsync' without using 'task(promise)'? did you forget to await the task?"
        )
    }
    expectNoActionsRunning()

    expect(danglingP).toBeTruthy()
    await danglingP
    expectNoActionsRunning()
})

test("dangling promises created directly inside the action without using task be ok", async () => {
    mobx.configure({ enforceActions: "observed" })
    let danglingP

    const f1 = actionAsync(async () => {
        danglingP = delay(100, 1) // dangling promise
    })

    await f1()

    expect(danglingP).toBeTruthy()
    await danglingP
    expectNoActionsRunning()
})

test("it should support recursive async", async () => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 10 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f1 = actionAsync(async () => {
        if (x.a <= 0) return
        x.a -= await task(delay(10, 1))
        await task(f1())
    })

    await f1()
    expect(values).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
    expectNoActionsRunning()
})

test("it should support parallel async", async () => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f1 = actionAsync(async () => {
        x.a = 2
        x.a = await task(delay(20, 6))
        x.a = await task(delay(40, 9))
    })

    const f2 = actionAsync(async () => {
        x.a = 3
        x.a = await task(delay(10, 5))
        x.a = await task(delay(30, 8))
    })

    const f3 = actionAsync(async () => {
        x.a = 4 // 5
        x.a = await task(delay(20, 7)) // 25
        x.a = await task(delay(40, 10)) // 45
    })

    await Promise.all([
        f1(),
        f2(),
        (async () => {
            await delay(5, 0)
            await f3()
        })(),
        (async () => {
            expectNoActionsRunning()
        })(),
        delayFn(4, expectNoActionsRunning),
        delayFn(6, expectNoActionsRunning),
        delayFn(15, expectNoActionsRunning),
        delayFn(24, expectNoActionsRunning),
        delayFn(26, expectNoActionsRunning),
        delayFn(35, expectNoActionsRunning),
        delayFn(44, expectNoActionsRunning),
        delayFn(46, expectNoActionsRunning)
    ])
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expectNoActionsRunning()
})

test("calling async actions that do not await should be ok", async () => {
    mobx.configure({ enforceActions: "observed" })
    const values = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f1 = actionAsync("f1", async () => {
        x.a++
    })
    const f2 = actionAsync("f2", async () => {
        x.a++
    })

    await f1()
    expectNoActionsRunning()
    await f2()
    expectNoActionsRunning()

    await Promise.all([f1(), f2()])
    expectNoActionsRunning()

    expect(values).toEqual([1, 2, 3, 4, 5])
})
