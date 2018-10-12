import { deepObserve } from "../src/mobx-utils"
import { observable, $mobx } from "mobx"

function cleanChange(change) {
    if (change.object) {
        return {
            ...change,
            object: {
                ...change.object,
                [$mobx]: undefined
            }
        }
    }
}

function assertChanges(target: any, fn: () => void) {
    // const d = deepObserve(x)
}


test("basic & dispose", () => {
    const x = observable({ a: 1, b: { z: 3 } })
    const events: any[] = []

    const d = deepObserve(x, (change, path) => {
        events.push([path, cleanChange(change)])
    })

    x.a = 2
    x.b.z = 4
    d()
    x.a = 3
    x.b.z = 5
    expect(events).toMatchSnapshot()
})