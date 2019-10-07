import { _startAction, _endAction, IActionRunInfo } from "mobx"
import { invariant } from "./utils"
import { decorateMethodOrField } from "./decorator-utils"
import { fail } from "./utils"

let runId = 0
const runningIds = new Set<number>()

interface IActionAsyncContext {
    runId: number
    step: number
    actionRunInfo: IActionRunInfo
    actionName: string
    scope: any
    args: IArguments
}

const actionAsyncContextStack: IActionAsyncContext[] = []

function getCurrentActionAsyncContext() {
    if (actionAsyncContextStack.length <= 0) {
        fail("'actionAsync' context not present")
    }
    return actionAsyncContextStack[actionAsyncContextStack.length - 1]!
}

async function task<R>(promise: Promise<R>): Promise<R> {
    invariant(
        typeof promise === "object" && typeof promise.then === "function",
        "'task' expects a promise"
    )

    const ctx = getCurrentActionAsyncContext()

    const { runId, actionName, args, scope, actionRunInfo, step } = ctx
    const nextStep = step + 1
    actionAsyncContextStack.pop()
    _endAction(actionRunInfo)

    try {
        return await promise
    } finally {
        // only restart if it not a dangling promise (the action is not yet finished)
        if (runningIds.has(runId)) {
            const actionRunInfo = _startAction(
                getActionAsyncName(actionName, runId, nextStep),
                this,
                args
            )

            actionAsyncContextStack.push({
                runId,
                step: nextStep,
                actionRunInfo,
                actionName,
                args,
                scope
            })
        }
    }
}

// method decorator
export function actionAsync(
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
): PropertyDescriptor

// field decorator
export function actionAsync(target: object, propertyKey: string): void

// non-decorator forms
export function actionAsync<F extends (...args: any[]) => Promise<any>>(name: string, fn: F): F
export function actionAsync<F extends (...args: any[]) => Promise<any>>(fn: F): F

// base

/**
 * Alternative syntax for async actions, similar to `flow` but more compatible with
 * Typescript typings. Not to be confused with `asyncAction`, which is deprecated.
 * 
 * `actionAsync` can be used either as a decorator or as a function.
 * 
 * It is *very* important to await for any promises that are created *directly* inside the async action,
 * or else an exception will be thrown.
 * 
 * When using the mobx devTools, an asyncAction will emit `action` events with names like:
 * * `"fetchUsers - runid 6 - step 0"`
 * * `"fetchUsers - runid 6 - step 1"`
 * * `"fetchUsers - runid 6 - step 2"`
 * 
 * The `runId` represents the action instance. In other words, if `fetchUsers` is invoked
 * multiple times concurrently, the events with the same `runid` belong together.
 * The `step` number indicates the code block that is now being executed.
 * 
 * @example
 * import {actionAsync} from "mobx-utils"
 *
 * let users = []
 *
 * const fetchUsers = actionAsync("fetchUsers", async (url) => {
 *   const start = Date.now()
 *   const data = await window.fetch(url)
 *   users = await data.json()
 *   return start - Date.now()
 * })
 *
 * const time = await fetchUsers("http://users.com")
 * console.log("Got users", users, "in ", time, "ms")
 *
 * @example
 * import {actionAsync} from "mobx-utils"
 *
 * mobx.configure({ enforceActions: "observed" }) // don't allow state modifications outside actions
 *
 * class Store {
 *   \@observable githubProjects = []
 *   \@state = "pending" // "pending" / "done" / "error"
 *
 *   \@actionAsync
 *   async fetchProjects() {
 *     this.githubProjects = []
 *     this.state = "pending"
 *     try {
 *       const projects = await fetchGithubProjectsSomehow()
 *       const filteredProjects = somePreprocessing(projects)
 *       // the asynchronous blocks will automatically be wrapped actions
 *       this.state = "done"
 *       this.githubProjects = filteredProjects
 *     } catch (error) {
 *        this.state = "error"
 *     }
 *   }
 * }
 */
export function actionAsync(arg1?: any, arg2?: any, arg3?: any): any {
    // decorator
    if (typeof arguments[1] === "string") {
        return decorateMethodOrField(
            "@actionAsync",
            (prop, v) => {
                return actionAsyncFn(prop, v)
            },
            arg1,
            arg2,
            arg3
        )
    }

    // direct invocation
    const actionName = typeof arg1 === "string" ? arg1 : arg1.name || "<unnamed action>"
    const fn = typeof arg1 === "function" ? arg1 : arg2

    return actionAsyncFn(actionName, fn)
}

function actionAsyncFn(actionName: string, fn: Function): Function {
    if (!_startAction || !_endAction) {
        fail("'actionAsync' requires mobx >=5.13.1 or >=4.13.1")
    }

    invariant(typeof fn === "function", "'asyncAction' expects a function")
    if (typeof actionName !== "string" || !actionName)
        fail(`actions should have valid names, got: '${actionName}'`)

    return async function(this: any, ...args: any) {
        const nextRunId = runId++
        runningIds.add(nextRunId)

        const actionRunInfo = _startAction(getActionAsyncName(actionName, nextRunId, 0), this, args)

        actionAsyncContextStack.push({
            runId: nextRunId,
            step: 0,
            actionRunInfo,
            actionName,
            args,
            scope: this
        })

        let errThrown: any
        try {
            const ret = await fn.apply(this, args)
            return ret
        } catch (err) {
            errThrown = err
            throw err
        } finally {
            runningIds.delete(nextRunId)

            const ctx = actionAsyncContextStack.pop()
            if (!ctx || ctx.runId !== nextRunId) {
                fail(
                    "'actionAsync' context not present or invalid. did you forget to await a promise directly created inside the async action?"
                )
            }

            ctx.actionRunInfo.error = errThrown
            _endAction(ctx.actionRunInfo)
        }
    }
}

function getActionAsyncName(actionName: string, runId: number, step: number) {
    return `${actionName} - runid ${runId} - step ${step}`
}

let promisePolyfilled = false

function polyfillPromise() {
    if (promisePolyfilled) {
        return
    }
    promisePolyfilled = true

    const OrigPromise: any = Promise

    const MobxPromise = function Promise(this: any, ...args: any[]) {
        const p = new OrigPromise(...args)

        if (actionAsyncContextStack.length > 0) {
            // inside an async action
            return task(p)
        } else {
            return p
        }
    }

    // hoist statics
    for (const pname of Object.getOwnPropertyNames(OrigPromise)) {
        const desc = Object.getOwnPropertyDescriptor(OrigPromise, pname)
        Object.defineProperty(MobxPromise, pname, desc)
    }
    for (const pname of Object.getOwnPropertySymbols(OrigPromise)) {
        const desc = Object.getOwnPropertyDescriptor(OrigPromise, pname)
        Object.defineProperty(MobxPromise, pname, desc)
    }

    Promise = MobxPromise as any
}

polyfillPromise()
