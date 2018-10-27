import { flow } from "mobx"
import { deprecated } from "./utils"

// method decorator:
export function asyncAction(
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
): PropertyDescriptor

// non-decorator forms
export function asyncAction<R>(generator: () => IterableIterator<any>): () => Promise<R>
export function asyncAction<A1>(
    generator: (a1: A1) => IterableIterator<any>
): (a1: A1) => Promise<any> // Ideally we want to have R instead of Any, but cannot specify R without specifying A1 etc... 'any' as result is better then not specifying request args
export function asyncAction<A1, A2, A3, A4, A5, A6, A7, A8>(
    generator: (
        a1: A1,
        a2: A2,
        a3: A3,
        a4: A4,
        a5: A5,
        a6: A6,
        a7: A7,
        a8: A8
    ) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => Promise<any>
export function asyncAction<A1, A2, A3, A4, A5, A6, A7>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => Promise<any>
export function asyncAction<A1, A2, A3, A4, A5, A6>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => Promise<any>
export function asyncAction<A1, A2, A3, A4, A5>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => Promise<any>
export function asyncAction<A1, A2, A3, A4>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4) => Promise<any>
export function asyncAction<A1, A2, A3>(
    generator: (a1: A1, a2: A2, a3: A3) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3) => Promise<any>
export function asyncAction<A1, A2>(
    generator: (a1: A1, a2: A2) => IterableIterator<any>
): (a1: A1, a2: A2) => Promise<any>
export function asyncAction<A1>(
    generator: (a1: A1) => IterableIterator<any>
): (a1: A1) => Promise<any>
// ... with name
export function asyncAction<R>(
    name: string,
    generator: () => IterableIterator<any>
): () => Promise<R>
export function asyncAction<A1>(
    name: string,
    generator: (a1: A1) => IterableIterator<any>
): (a1: A1) => Promise<any> // Ideally we want to have R instead of Any, but cannot specify R without specifying A1 etc... 'any' as result is better then not specifying request args
export function asyncAction<A1, A2, A3, A4, A5, A6, A7, A8>(
    name: string,
    generator: (
        a1: A1,
        a2: A2,
        a3: A3,
        a4: A4,
        a5: A5,
        a6: A6,
        a7: A7,
        a8: A8
    ) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => Promise<any>
export function asyncAction<A1, A2, A3, A4, A5, A6, A7>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => Promise<any>
export function asyncAction<A1, A2, A3, A4, A5, A6>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => Promise<any>
export function asyncAction<A1, A2, A3, A4, A5>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => Promise<any>
export function asyncAction<A1, A2, A3, A4>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3, a4: A4) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4) => Promise<any>
export function asyncAction<A1, A2, A3>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3) => Promise<any>
export function asyncAction<A1, A2>(
    name: string,
    generator: (a1: A1, a2: A2) => IterableIterator<any>
): (a1: A1, a2: A2) => Promise<any>
export function asyncAction<A1>(
    name: string,
    generator: (a1: A1) => IterableIterator<any>
): (a1: A1) => Promise<any>

/**
 * _deprecated_ this functionality can now be found as `flow` in the mobx package. However, `flow` is not applicable as decorator, where `asyncAction` still is.
 *
 *
 *
 * `asyncAction` takes a generator function and automatically wraps all parts of the process in actions. See the examples below.
 * `asyncAction` can be used both as decorator or to wrap functions.
 *
 * - It is important that `asyncAction should always be used with a generator function (recognizable as `function*` or `*name` syntax)
 * - Each yield statement should return a Promise. The generator function will continue as soon as the promise settles, with the settled value
 * - When the generator function finishes, you can return a normal value. The `asyncAction` wrapped function will always produce a promise delivering that value.
 *
 * When using the mobx devTools, an asyncAction will emit `action` events with names like:
 * * `"fetchUsers - runid: 6 - init"`
 * * `"fetchUsers - runid: 6 - yield 0"`
 * * `"fetchUsers - runid: 6 - yield 1"`
 *
 * The `runId` represents the generator instance. In other words, if `fetchUsers` is invoked multiple times concurrently, the events with the same `runid` belong toghether.
 * The `yield` number indicates the progress of the generator. `init` indicates spawning (it won't do anything, but you can find the original arguments of the `asyncAction` here).
 * `yield 0` ... `yield n` indicates the code block that is now being executed. `yield 0` is before the first `yield`, `yield 1` after the first one etc. Note that yield numbers are not determined lexically but by the runtime flow.
 *
 * `asyncActions` requires `Promise` and `generators` to be available on the target environment. Polyfill `Promise` if needed. Both TypeScript and Babel can compile generator functions down to ES5.
 *
 *  N.B. due to a [babel limitation](https://github.com/loganfsmyth/babel-plugin-transform-decorators-legacy/issues/26), in Babel generatos cannot be combined with decorators. See also [#70](https://github.com/mobxjs/mobx-utils/issues/70)
 *
 *
 * @example
 * import {asyncAction} from "mobx-utils"
 *
 * let users = []
 *
 * const fetchUsers = asyncAction("fetchUsers", function* (url) {
 *   const start = Date.now()
 *   const data = yield window.fetch(url)
 *   users = yield data.json()
 *   return start - Date.now()
 * })
 *
 * fetchUsers("http://users.com").then(time => {
 *   console.dir("Got users", users, "in ", time, "ms")
 * })
 *
 * @example
 * import {asyncAction} from "mobx-utils"
 *
 * mobx.configure({ enforceActions: "observed" }) // don't allow state modifications outside actions
 *
 * class Store {
 * 	\@observable githubProjects = []
 * 	\@state = "pending" // "pending" / "done" / "error"
 *
 * 	\@asyncAction
 * 	*fetchProjects() { // <- note the star, this a generator function!
 * 		this.githubProjects = []
 * 		this.state = "pending"
 * 		try {
 * 			const projects = yield fetchGithubProjectsSomehow() // yield instead of await
 * 			const filteredProjects = somePreprocessing(projects)
 * 			// the asynchronous blocks will automatically be wrapped actions
 * 			this.state = "done"
 * 			this.githubProjects = filteredProjects
 * 		} catch (error) {
 * 			this.state = "error"
 * 		}
 * 	}
 * }
 *
 * @export
 * @returns {Promise}
 */

export function asyncAction(arg1: any, arg2?: any): any {
    // decorator
    if (typeof arguments[1] === "string") {
        const name = arguments[1]
        const descriptor: PropertyDescriptor = arguments[2]
        if (descriptor && descriptor.value) {
            return Object.assign({}, descriptor, {
                value: flow(descriptor.value)
            })
        } else {
            return Object.assign({}, descriptor, {
                set(v: any) {
                    Object.defineProperty(this, name, {
                        ...descriptor,
                        value: flow(v)
                    })
                }
            })
        }
    }

    // direct invocation
    const generator = typeof arg1 === "string" ? arg2 : arg1
    const name = typeof arg1 === "string" ? arg1 : generator.name || "<unnamed async action>"
    deprecated("asyncAction is deprecated. use mobx.flow instead")
    return flow(generator) // name get's dropped..
}
