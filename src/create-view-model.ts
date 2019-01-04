import {
    action,
    ObservableMap,
    observable,
    isObservableObject,
    isObservableArray,
    isObservableMap,
    isComputedProp,
    isComputed,
    computed,
    keys,
    _getAdministration,
    $mobx
} from "mobx"
import { invariant } from "./utils"

export interface IViewModel<T> {
    model: T
    reset(): void
    submit(): void
    isDirty: boolean
    isPropertyDirty(key: string): boolean
    resetProperty(key: string): void
}

const RESERVED_NAMES = ["model", "reset", "submit", "isDirty", "isPropertyDirty", "resetProperty"]

export class ViewModel<T> implements IViewModel<T> {
    localValues: ObservableMap<any, any> = observable.map({})
    localComputedValues: ObservableMap<any, any> = observable.map({})

    @computed
    get isDirty() {
        return this.localValues.size > 0
    }

    constructor(public model: T) {
        invariant(isObservableObject(model), "createViewModel expects an observable object")

        Object.getOwnPropertyNames(model).forEach(key => {
            if (key === ($mobx as any) || key === "__mobxDidRunLazyInitializers") {
                return
            }
            invariant(
                RESERVED_NAMES.indexOf(key) === -1,
                `The propertyname ${key} is reserved and cannot be used with viewModels`
            )
            if (isComputedProp(model, key)) {
                const derivation = _getAdministration(model, key).derivation // Fixme: there is no clear api to get the derivation
                this.localComputedValues.set(key, computed(derivation.bind(this)))
            }

            const { enumerable } = Object.getOwnPropertyDescriptor(model, key)

            Object.defineProperty(this, key, {
                enumerable,
                configurable: true,
                get: () => {
                    if (isComputedProp(model, key)) return this.localComputedValues.get(key).get()
                    if (this.isPropertyDirty(key)) return this.localValues.get(key)
                    else return (this.model as any)[key]
                },
                set: action((value: any) => {
                    if (this.isPropertyDirty(key) || value !== (this.model as any)[key]) {
                        this.localValues.set(key, value)
                    }
                })
            })
        })
    }

    isPropertyDirty = (key: string): boolean => {
        return this.localValues.has(key)
    }

    @action.bound
    submit() {
        keys(this.localValues).forEach((key: string) => {
            const source = this.localValues.get(key)
            const destination = (this.model as any)[key]
            if (isObservableArray(destination)) {
                destination.replace(source)
            } else if (isObservableMap(destination)) {
                destination.clear()
                destination.merge(source)
            } else if (!isComputed(source)) {
                ; (this.model as any)[key] = source
            }
        })
        this.localValues.clear()
    }

    @action.bound
    reset() {
        this.localValues.clear()
    }

    @action.bound
    resetProperty(key: string) {
        this.localValues.delete(key)
    }
}

/**
 * `createViewModel` takes an object with observable properties (model)
 * and wraps a viewmodel around it. The viewmodel proxies all enumerable properties of the original model with the following behavior:
 *  - as long as no new value has been assigned to the viewmodel property, the original property will be returned.
 *  - any future change in the model will be visible in the viewmodel as well unless the viewmodel property was dirty at the time of the attempted change.
 *  - once a new value has been assigned to a property of the viewmodel, that value will be returned during a read of that property in the future. However, the original model remain untouched until `submit()` is called.
 *
 * The viewmodel exposes the following additional methods, besides all the enumerable properties of the model:
 * - `submit()`: copies all the values of the viewmodel to the model and resets the state
 * - `reset()`: resets the state of the viewmodel, abandoning all local modifications
 * - `resetProperty(propName)`: resets the specified property of the viewmodel
 * - `isDirty`: observable property indicating if the viewModel contains any modifications
 * - `isPropertyDirty(propName)`: returns true if the specified property is dirty
 * - `model`: The original model object for which this viewModel was created
 *
 * You may use observable arrays, maps and objects with `createViewModel` but keep in mind to assign fresh instances of those to the viewmodel's properties, otherwise you would end up modifying the properties of the original model.
 * Note that if you read a non-dirty property, viewmodel only proxies the read to the model. You therefore need to assign a fresh instance not only the first time you make the assignment but also after calling `reset()` or `submit()`.
 *
 * @example
 * class Todo {
 *   \@observable title = "Test"
 * }
 *
 * const model = new Todo()
 * const viewModel = createViewModel(model);
 *
 * autorun(() => console.log(viewModel.model.title, ",", viewModel.title))
 * // prints "Test, Test"
 * model.title = "Get coffee"
 * // prints "Get coffee, Get coffee", viewModel just proxies to model
 * viewModel.title = "Get tea"
 * // prints "Get coffee, Get tea", viewModel's title is now dirty, and the local value will be printed
 * viewModel.submit()
 * // prints "Get tea, Get tea", changes submitted from the viewModel to the model, viewModel is proxying again
 * viewModel.title = "Get cookie"
 * // prints "Get tea, Get cookie" // viewModel has diverged again
 * viewModel.reset()
 * // prints "Get tea, Get tea", changes of the viewModel have been abandoned
 *
 * @param {T} model
 * @returns {(T & IViewModel<T>)}
 * ```
 */
export function createViewModel<T>(model: T): T & IViewModel<T> {
    return new ViewModel(model) as any
}
