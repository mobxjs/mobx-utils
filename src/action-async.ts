import { _startAction, _endAction, IActionRunInfo } from "mobx"
import { invariant } from "./utils"
import { decorateMethodOrField } from "./decorator-utils"
import { fail } from "./utils"

let runId = 0
const unfinishedIds = new Set<number>()
const currentlyActiveIds = new Set<number>()

interface IActionAsyncContext {
    runId: number
    step: number
    actionRunInfo: IActionRunInfo
    actionName: string
    scope: any
    args: IArguments
}

const actionAsyncContextStack: IActionAsyncContext[] = []

export async function task<R>(value: R | PromiseLike<R>): Promise<R> {
    const ctx = actionAsyncContextStack[actionAsyncContextStack.length - 1]

    if (!ctx) {
        fail(
            "'actionAsync' context not present when running 'task'. did you await inside an 'actionAsync' without using 'task(promise)'? did you forget to await the task?"
        )
    }

    const { runId, actionName, args, scope, actionRunInfo, step } = ctx
    const nextStep = step + 1
    actionAsyncContextStack.pop()
    _endAction(actionRunInfo)
    currentlyActiveIds.delete(runId)

    try {
        return await value
    } finally {
        // only restart if it not a dangling promise (the action is not yet finished)
        if (unfinishedIds.has(runId)) {
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
            currentlyActiveIds.add(runId)
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
 * It takes an async function that internally must use `await task(promise)` rather than
 * the standard `await promise`.
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
        unfinishedIds.add(nextRunId)

        const actionRunInfo = _startAction(getActionAsyncName(actionName, nextRunId, 0), this, args)

        actionAsyncContextStack.push({
            runId: nextRunId,
            step: 0,
            actionRunInfo,
            actionName,
            args,
            scope: this
        })
        currentlyActiveIds.add(nextRunId)

        const finish = (err: any) => {
            unfinishedIds.delete(nextRunId)

            const ctx = actionAsyncContextStack.pop()
            if (!ctx || ctx.runId !== nextRunId) {
                // push it back if invalid
                if (ctx) {
                    actionAsyncContextStack.push(ctx)
                }

                let msg = `invalid 'actionAsync' context when finishing action '${actionName}'.`
                if (!ctx) {
                    msg += " no action context could be found instead."
                } else {
                    msg += ` an action context for '${ctx.actionName}' was found instead.`
                }
                msg +=
                    " did you await inside an 'actionAsync' without using 'task(promise)'? did you forget to await the task?"
                fail(msg)
            }
            ctx.actionRunInfo.error = err
            _endAction(ctx.actionRunInfo)
            currentlyActiveIds.delete(nextRunId)

            if (err) {
                throw err
            }
        }

        let promise: any
        try {
            promise = fn.apply(this, args)
        } catch (err) {
            finish(err)
        }

        // are we done sync? (no task run)
        if (currentlyActiveIds.has(nextRunId)) {
            finish(undefined)
            return promise
        }

        try {
            const ret = await promise
            finish(undefined)
            return ret
        } catch (err) {
            finish(err)
        }
    }
}

function getActionAsyncName(actionName: string, runId: number, step: number) {
    return `${actionName} - runid ${runId} - step ${step}`
}
