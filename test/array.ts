import * as utils from "../src/mobx-utils"
import { observable } from "mobx"
import { moveItem } from "../src/mobx-utils"

test("it should move the item as expected", () => {
    const source = observable<number>([1, 2, 3])
    expect(moveItem(source, 0, 1)).toBe(source)
    expect(source[0]).toBe(2)
    expect(source[1]).toBe(1)
    expect(source[2]).toBe(3)

    moveItem(source, 1, 0)

    expect(source[0]).toBe(1)
    expect(source[1]).toBe(2)
    expect(source[2]).toBe(3)
})
test("it throws when index is out of bounds", () => {
    const source = observable<number>([1, 2, 3])
    expect(moveItem(source, 0, 0)).toBeUndefined()
    expect(moveItem(source, 2, 2)).toBeUndefined()
})

test("it throws when index is out of bounds", () => {
    const source = observable<number>([1, 2, 3])
    expect(() => moveItem(source, 0, -1)).toThrowErrorMatchingSnapshot()
    expect(() => moveItem(source, 0, 3)).toThrowErrorMatchingSnapshot()
})
