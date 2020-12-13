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
 * The operation can be cancelled by the cancel operation added to the returned promise. This will reject the Promise.
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
 * @returns a Promise that resolves with the observed value when it fulfills the conditions of the predicate
 */
export function whenValue<T>(
    generator: () => T | undefined,
    predicate: (value: T) => boolean = () => true
): Promise<T> & { cancel: () => void } {
    let cancel: () => void = () => undefined

    const p = new Promise<T>((resolve, reject) => {
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

        cancel = () => {
            disposer()
            reject("WHEN_VALUE_CANCELLED")
        }
    })

    const res = p as any
    res.cancel = cancel
    return res
}
