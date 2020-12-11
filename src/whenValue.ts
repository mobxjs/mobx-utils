import { autorun, computed } from "mobx"

/**
 * Creates a Promise that resolves with an observed value when it fulfills the conditions of a predicate.
 *
 * The generator function selects the to be observed value. If the generator creates an undefined value it is ignored.
 * If the generator creates a value, it will be passed to the predicate function that indicates if that value should
 * resolve the promise.
 *
 * Any error in the generator or predicate functions will reject the promise.
 *
 * An abort signal may be provided to cancel the wait for the observed value. This will reject the promise.
 *
 * @example
 * const store = observed({
 *   foo:""
 * });
 *
 * //wait until store.foo contains the character "b"
 * await whenValue(()=>store.foo, (value)=>value.indexOf("b")>=0);
 *  *
 * @param generator - selects the value to be observed
 * @param predicate - optional predicate to indicate when the observed value should resolve the promise. By default accepts all values.
 * @param abortSignal - singal to abort wait for the observed value change (using AbortSignal WebAPI)
 * @returns a Promise that resolves with the observed value when it fulfills the conditions of the predicate
 */
export function whenValue<T>(
    generator: () => T | undefined,
    predicate: (value: T) => boolean = () => true,
    abortSignal?: AbortSignal
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const disposer = autorun((reaction) => {
            try {
                const value = computed(generator).get()
                if (value !== undefined && predicate(value)) {
                    resolve(value)
                    reaction.dispose()
                }
            } catch (err) {
                reject(err)
                reaction.dispose()
            }
        })
        if (abortSignal) {
            abortSignal.onabort = () => {
                disposer()
                reject(new Error("Aborted wait for observed value change"))
            }
        }
    })
}
