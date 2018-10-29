import { computed, onBecomeUnobserved, IComputedValue } from "mobx"
import { invariant, addHiddenProp } from "./utils"

export type ITransformer<A, B> = (object: A) => B

let memoizationId = 0

/**
 * Creates a function that maps an object to a view.
 * The mapping is memoized.
 *
 * See: https://mobx.js.org/refguide/create-transformer.html
 */
export function createTransformer<A, B>(
    transformer: ITransformer<A, B>,
    onCleanup?: (resultObject: B | undefined, sourceObject?: A) => void
): ITransformer<A, B> {
    invariant(
        typeof transformer === "function" && transformer.length < 2,
        "createTransformer expects a function that accepts one argument"
    )

    // Memoizes: object id -> reactive view that applies transformer to the object
    let views: { [id: number]: IComputedValue<B> } = {}

    function createView(sourceIdentifier: number, sourceObject: A) {
        let latestValue: B
        const expr = computed(
            () => {
                return (latestValue = transformer(sourceObject))
            },
            {
                name: `Transformer-${(<any>transformer).name}-${sourceIdentifier}`
            }
        )
        const disposer = onBecomeUnobserved(expr, () => {
            delete views[sourceIdentifier]
            disposer()
            if (onCleanup) onCleanup(latestValue, sourceObject)
        })
        return expr
    }

    return (object: A) => {
        const identifier = getMemoizationId(object)
        let reactiveView = views[identifier]
        if (reactiveView) return reactiveView.get()
        // Not in cache; create a reactive view
        reactiveView = views[identifier] = createView(identifier, object)
        return reactiveView.get()
    }
}

function getMemoizationId(object: any) {
    const objectType = typeof object
    if (objectType === "string") return `string:${object}`
    if (objectType === "number") return `number:${object}`
    if (object === null || (objectType !== "object" && objectType !== "function"))
        throw new Error(
            `[mobx-utils] transform expected an object, function, string or number, got: ${String(object)}`
        )
    let tid = object.$transformId
    if (tid === undefined) {
        tid = `memoizationId:${++memoizationId}`
        addHiddenProp(object, "$transformId", tid)
    }
    return tid
}
