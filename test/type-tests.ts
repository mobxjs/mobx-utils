import { fromPromise, FULFILLED } from "../src/mobx-utils"

test("just some typings", () => {
    {
        // test typings of fromPromise
        const x = { x: 3 }
        const p = fromPromise(Promise.resolve(x))
        // p.value // compile error!
        if (p.state === FULFILLED) {
            p.value.x = 4 // value only available if state is checked!
        }
    }

    {
        // typings: can create a resolved promise
        const x = { x: 3 }
        const p = fromPromise.resolve(x)
        p.value.x = 7
    }

    expect(true).toBe(true)
})
