import { configure, isObservable, isObservableMap, observable } from "mobx"
import { updateableObservable } from "../src/mobx-utils"

configure({
    enforceActions: "always"
})
;["shallow", "deep"].forEach(m => {
    const mode: "shallow" | "deep" = m as any

    test(`${mode} mode`, () => {
        const u = updateableObservable<any>(123, mode)
        expect(u.get()).toBe(123)

        function check(newVal: any) {
            u.update(newVal)
            expect(u.get()).toEqual(newVal)
            expect(isObservable(u.getBoxed())).toBe(true)
        }

        {
            // plain values
            check(10)
            check(11)
            check("str")
        }

        {
            // simple objects
            const orig: any = { val: "hi" }
            check(orig)

            const o = u.get()

            orig.val2 = "hi2"
            check(orig)
            expect(u.get()).toBe(o)

            check({ val2: "hi" })
            expect(u.get()).toBe(o)
        }

        {
            // arrays
            const orig = [1, 2, 3]
            check(orig)

            const arr = u.get()

            orig.push(4)
            check(orig)
            expect(u.get()).toBe(arr)

            check([1, 2, 3, 4])
            expect(u.get()).toBe(arr)
        }

        {
            // maps
            const orig = new Map([[1, 2], [3, 4]])
            u.update(orig)
            const map = u.get()
            expect(isObservableMap(map)).toBe(true)
            expect(Array.from(map.entries())).toEqual([[1, 2], [3, 4]])

            orig.set(5, 6)
            u.update(orig)
            expect(u.get()).toBe(map)
            expect(isObservableMap(map)).toBe(true)
            expect(Array.from(map.entries())).toEqual([[1, 2], [3, 4], [5, 6]])

            u.update(new Map([[1, 2]]))
            expect(u.get()).toBe(map)
            expect(isObservableMap(map)).toBe(true)
            expect(Array.from(map.entries())).toEqual([[1, 2]])
        }

        {
            // objects within objects
            const orig = { o: { o2: "ho" } }
            check(orig)

            orig.o.o2 = "hu"
            check(orig)

            const obj = u.get()
            const objO = u.get().o
            check({ o: { o3: "he" } })
            expect(u.get()).toBe(obj)
            if (mode === "deep") {
                expect(u.get().o).toBe(objO)
            } else {
                expect(u.get().o).not.toBe(objO)
            }
        }

        {
            // boxed observables are kept that way
            const obs = observable.box(10)
            u.update(obs)
            expect(u.get()).toBe(obs)
        }
    })
})

test("custom deep props", () => {
    interface IObj {
        p1: {
            x: number
        }
        p2: {
            x: number
        }
    }
    const val = {
        p1: {
            x: 1
        },
        p2: {
            x: 2
        }
    }
    const u = updateableObservable<IObj>(val, {
        deepProps: ["p1"]
    })
    expect(u.get()).toEqual(val)

    const p1 = u.get().p1
    const p2 = u.get().p2
    const newVal = {
        p1: {
            x: 10
        },
        p2: {
            x: 20
        }
    }
    u.update(newVal)
    expect(u.get()).toEqual(newVal)
    expect(u.get().p1).toBe(p1)
    expect(u.get().p2).not.toBe(p2) // it will just create a new object since this one is not deep
})
