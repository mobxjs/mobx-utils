import {
    action,
    ObservableMap,
    IComputedValue,
    observable,
    isObservableObject,
    isObservableArray,
    isObservableMap,
    isComputedProp,
    isComputed,
    computed,
    keys,
    _getAdministration,
    $mobx,
    makeObservable,
} from "mobx"
import { ComputedValue } from "mobx/dist/internal"
import { invariant, getAllMethodsAndProperties } from "./utils"

/**
 * An IViewModel proxies all enumerable properties of the original model with the following behavior:
 *  - as long as no new value has been assigned to the viewmodel property, the original property will be returned.
 *  - any future change in the model will be visible in the viewmodel as well unless the viewmodel property was dirty at the time of the attempted change.
 *  - once a new value has been assigned to a property of the viewmodel, that value will be returned during a read of that property in the future. However, the original model remain untouched until `submit()` is called.
 */
export interface IViewModel<T> {
    /**
     * The original model object for which this viewModel was created
     */
    model: T

    /**
     * Copies all the values of the viewmodel to the model and resets the state
     *
     * `@action.bound`
     */
    submit(): void

    /**
     * Resets the state of the viewmodel, abandoning all local modifications
     *
     * `@action.bound`
     */
    reset(): void

    /**
     * Resets the specified property of the viewmodel, abandoning local modifications of this property
     *
     * `@action.bound`
     */
    resetProperty(key: keyof T): void

    /**
     * Indicating if the viewModel contains any modifications
     *
     * `@computed` property
     */
    isDirty: boolean

    /**
     * Returns true if the specified property is dirty
     */
    isPropertyDirty(key: keyof T): boolean

    /**
     * Returns a key / value map with the properties that have been changed in the model so far
     *
     * `@computed` property
     */
    changedValues: Map<keyof T, T[keyof T]>
}

const RESERVED_NAMES = ["model", "reset", "submit", "isDirty", "isPropertyDirty", "resetProperty"]

export class ViewModel<T> implements IViewModel<T> {
    localValues: ObservableMap<keyof T, T[keyof T]> = observable.map({})
    localComputedValues: ObservableMap<keyof T, IComputedValue<T[keyof T]>> = observable.map({})

    @computed
    get isDirty() {
        return this.localValues.size > 0
    }

    @computed
    get changedValues() {
        return new Map(this.localValues)
    }

    constructor(public model: T) {
        makeObservable(this)
        invariant(isObservableObject(model), "createViewModel expects an observable object")
        const ownMethodsAndProperties = getAllMethodsAndProperties(this)

        // use this helper as Object.getOwnPropertyNames doesn't return getters
        getAllMethodsAndProperties(model).forEach((key: any) => {
            if (ownMethodsAndProperties.includes(key)) {
                return
            }
            if (key === ($mobx as any) || key === "__mobxDidRunLazyInitializers") {
                return
            }
            invariant(
                RESERVED_NAMES.indexOf(key) === -1,
                `The propertyname ${key} is reserved and cannot be used with viewModels`
            )
            if (isComputedProp(model, key)) {
                const computedBox = _getAdministration(model, key) as ComputedValue<T[keyof T]> // Fixme: there is no clear api to get the derivation
                const get = computedBox.derivation.bind(this)
                const set = computedBox.setter_?.bind(this)
                this.localComputedValues.set(key, computed(get, { set }))
            }

            const descriptor = Object.getOwnPropertyDescriptor(model, key)
            const additionalDescriptor = descriptor ? { enumerable: descriptor.enumerable } : {}

            Object.defineProperty(this, key, {
                ...additionalDescriptor,
                configurable: true,
                get: () => {
                    if (isComputedProp(model, key)) return this.localComputedValues.get(key)!.get()
                    if (this.isPropertyDirty(key)) return this.localValues.get(key)
                    else return this.model[key as keyof T]
                },
                set: action((value: any) => {
                    if (isComputedProp(model, key)) {
                        this.localComputedValues.get(key)!.set(value)
                    } else if (value !== this.model[key as keyof T]) {
                        this.localValues.set(key, value)
                    } else {
                        this.localValues.delete(key)
                    }
                }),
            })
        })
    }

    isPropertyDirty = (key: keyof T): boolean => {
        return this.localValues.has(key)
    }

    @action.bound
    submit() {
        keys(this.localValues).forEach((key: keyof T) => {
            const source = this.localValues.get(key)!
            const destination = this.model[key]
            if (isObservableArray(destination)) {
                destination.replace(source as any)
            } else if (isObservableMap(destination)) {
                destination.clear()
                destination.merge(source)
            } else if (!isComputed(source)) {
                this.model[key] = source
            }
        })
        this.localValues.clear()
    }

    @action.bound
    reset() {
        this.localValues.clear()
    }

    @action.bound
    resetProperty(key: keyof T) {
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
 * - `model`: The original model object for which this viewModel was created
 * - `submit()`: Copies all the values of the viewmodel to the model and resets the state
 * - `reset()`: Resets the state of the viewmodel, abandoning all local modifications
 * - `resetProperty(propName)`: Resets the specified property of the viewmodel, abandoning local modifications of this property
 * - `isDirty`: Observable property indicating if the viewModel contains any modifications
 * - `isPropertyDirty(propName)`: Returns true if the specified property is dirty
 * - `changedValues`: Returns a key / value map with the properties that have been changed in the model so far
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
