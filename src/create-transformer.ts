import {
    computed,
    onBecomeUnobserved,
    IComputedValue,
    _isComputingDerivation,
    IComputedValueOptions,
} from "mobx"
import { invariant } from "./utils"

export type ITransformer<A, B> = (object: A) => B

export type ITransformerCleanup<A, B> = (resultObject: B | undefined, sourceObject?: A) => void

export type ITransformerParams<A, B> = {
    onCleanup?: ITransformerCleanup<A, B>
    debugNameGenerator?: (sourceObject?: A) => string
    keepAlive?: boolean
} & Omit<IComputedValueOptions<B>, "name">

export function createTransformer<A, B>(
    transformer: ITransformer<A, B>,
    onCleanup?: ITransformerCleanup<A, B>
): ITransformer<A, B>
export function createTransformer<A, B>(
    transformer: ITransformer<A, B>,
    arg2?: ITransformerParams<A, B>
): ITransformer<A, B>
/**
 * Creates a function that maps an object to a view.
 * The mapping is memoized.
 *
 * See the [transformer](#createtransformer-in-detail) section for more details.
 *
 * @param transformer A function which transforms instances of A into instances of B
 * @param arg2 An optional cleanup function which is called when the transformation is no longer
 * observed from a reactive context, or config options
 * @returns The memoized transformer function
 */
export function createTransformer<A, B>(
    transformer: ITransformer<A, B>,
    arg2?: ITransformerParams<A, B> | ITransformerCleanup<A, B>
): ITransformer<A, B> {
    invariant(
        typeof transformer === "function" && transformer.length < 2,
        "createTransformer expects a function that accepts one argument"
    )

    // Memoizes: object -> reactive view that applies transformer to the object
    const views = new Map<A, IComputedValue<B>>()
    let onCleanup: Function | undefined = undefined
    let keepAlive: boolean = false
    let debugNameGenerator: Function | undefined = undefined
    if (typeof arg2 === "object") {
        onCleanup = arg2.onCleanup
        keepAlive = arg2.keepAlive !== undefined ? arg2.keepAlive : false
        debugNameGenerator = arg2.debugNameGenerator
    } else if (typeof arg2 === "function") {
        onCleanup = arg2
    }

    function createView(sourceObject: A) {
        let latestValue: B
        let computedValueOptions = {}
        if (typeof arg2 === "object") {
            onCleanup = arg2.onCleanup
            debugNameGenerator = arg2.debugNameGenerator
            computedValueOptions = arg2
        } else if (typeof arg2 === "function") {
            onCleanup = arg2
        } else {
            onCleanup = undefined
            debugNameGenerator = undefined
        }
        const sourceType = typeof sourceObject
        const prettifiedName = debugNameGenerator
            ? debugNameGenerator(sourceObject)
            : `Transformer-${(<any>transformer).name}-${
                  sourceType === "string" || sourceType === "number" ? sourceObject : "object"
              }`
        const expr = computed(
            () => {
                return (latestValue = transformer(sourceObject))
            },
            {
                ...computedValueOptions,
                name: prettifiedName,
            }
        )
        if (!keepAlive) {
            const disposer = onBecomeUnobserved(expr, () => {
                views.delete(sourceObject)
                disposer()
                if (onCleanup) onCleanup(latestValue, sourceObject)
            })
        }
        return expr
    }

    let memoWarned = false
    return (object: A) => {
        checkTransformableObject(object)
        let reactiveView = views.get(object)
        if (reactiveView) return reactiveView.get()
        if (!keepAlive && !_isComputingDerivation()) {
            if (!memoWarned) {
                console.warn(
                    "invoking a transformer from outside a reactive context won't memorized " +
                        "and is cleaned up immediately, unless keepAlive is set"
                )
                memoWarned = true
            }
            const value = transformer(object)
            if (onCleanup) onCleanup(value, object)
            return value
        }
        // Not in cache; create a reactive view
        reactiveView = createView(object)
        views.set(object, reactiveView)
        return reactiveView.get()
    }
}

function checkTransformableObject(object: any) {
    const objectType = typeof object
    if (
        object === null ||
        (objectType !== "object" &&
            objectType !== "function" &&
            objectType !== "string" &&
            objectType !== "number")
    )
        throw new Error(
            `[mobx-utils] transform expected an object, function, string or number, got: ${String(
                object
            )}`
        )
}
