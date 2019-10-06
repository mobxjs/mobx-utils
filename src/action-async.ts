import { _startAction, _endAction, IActionRunInfo } from "mobx"
import { invariant } from "./utils"
import { decorateMethodOrField } from "./decorator-utils"

let runId = 0

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
        fail(
            "'actionAsync' context not present. did you await inside an 'actionAsync' without using 'task(promise)'?"
        )
    }
    return actionAsyncContextStack[actionAsyncContextStack.length - 1]!
}

export async function task<R>(promise: Promise<R>): Promise<R> {
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
 * It takes an async function that internally must use `await task(promise)` rather than
 * the standard `await promise`.
 * 
 * When using the mobx devTools, an asyncAction will emit `action` events with names like:
 * * `"fetchUsers - runid 6 - step 0"`
 * * `"fetchUsers - runid 6 - step 1"`
 * * `"fetchUsers - runid 6 - step 2"`
 * 
 * The `runId` represents the action instance. In other words, if `fetchUsers` is invoked
 * multiple times concurrently, the events with the same `runid` belong toghether.
 * The `step` number indicates the code block that is now being executed.
 * 
 * @example
 * import {actionAsync, task} from "mobx-utils"
 *
 * let users = []
 *
 * const fetchUsers = actionAsync("fetchUsers", async (url) => {
 *   const start = Date.now()
 *   // note the use of task when awaiting!
 *   const data = await task(window.fetch(url))
 *   users = await task(data.json())
 *   return start - Date.now()
 * })
 *
 * const time = await fetchUsers("http://users.com")
 * console.log("Got users", users, "in ", time, "ms")
 *
 * @example
 * import {actionAsync, task} from "mobx-utils"
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
 *       // note the use of task when awaiting!
 *       const projects = await task(fetchGithubProjectsSomehow())
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
            const ctx = actionAsyncContextStack.pop()
            if (!ctx || ctx.runId !== nextRunId) {
                fail(
                    "'actionAsync' context not present or invalid. did you await inside an 'actionAsync' without using 'task(promise)'?"
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
