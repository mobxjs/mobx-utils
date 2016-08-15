import {observable, action, ObservableMap, asMap, isObservableObject} from "mobx";
import {invariant} from "./utils";

export interface IViewModel<T> {
    model: T;
    reset(): void;
    submit(): void;
    isDirty: boolean;
    isPropertyDirty(key: string): boolean;
}

const RESERVED_NAMES = ["model", "reset", "submit", "isDirty", "isPropertyDirty"];

class ViewModel<T> implements IViewModel<T> {
    @observable isDirty = false;
    localValues: ObservableMap<any> = asMap({});
    dirtyMap: ObservableMap<any> = asMap({});

    constructor(public model: T) {
        invariant(isObservableObject(model), "createViewModel expects an observable object");
        Object.keys(model).forEach(key => {
            invariant(RESERVED_NAMES.indexOf(key) === -1, `The propertyname ${key} is reserved and cannot be used with viewModels`);
            // TODO: create shallow clones for arrays and maps and observe those
            Object.defineProperty(this, key, {
                enumerable: true,
                configurable: true,
                get: () => {
                    if (this.isPropertyDirty(key))
                        return this.localValues.get(key);
                    else
                        return (this.model as any)[key];
                },
                set: action((value: any) => {
                    if (this.isPropertyDirty(key) || value !== (this.model as any)[key]) {
                        this.isDirty = true;
                        this.dirtyMap.set(key, true);
                        this.localValues.set(key, value);
                    }
                })
            });
        });
    }

    isPropertyDirty(key: string): boolean {
        return this.dirtyMap.get(key) === true;
    }

    @action submit() {
        if (this.isDirty) {
            this.isDirty = false;
            this.dirtyMap.entries().forEach(([key, dirty]) => {
                if (dirty === true) {
                    (this.model as any)[key] = this.localValues.get(key);
                    this.dirtyMap.set(key, false);
                    this.localValues.delete(key);
                }
            });
        }
    }

    @action reset() {
        if (this.isDirty) {
            this.isDirty = false;
            this.dirtyMap.entries().forEach(([key, dirty]) => {
                if (dirty === true) {
                    this.dirtyMap.set(key, false);
                    this.localValues.delete(key);
                }
            });
        }
    }
}

/**
 * `createViewModel` takes an object with observable properties (model)
 * and wraps a view model around it. The view model proxies all enumerable property of the original model with the following behavior:
 *  - as long as no new value has been assigned to the viewmodel property, the original property will be returned, and any future change in the model will be visible in the view model as well
 *  - once a new value has been assigned to a property of the viewmodel, that value will be returned during a read of that property in the future
 *
 * The viewmodel exposes the following additional methods, besides all the enumerable properties of the model:
 * - `submit()`: copies all the values of the viewmodel to the model and resets the state
 * - `reset()`: resets the state of the view model, abandoning all local modificatoins
 * - `isDirty`: observable property indicating if the viewModel contains any modifications
 * - `isPropertyDirty(propName)`: returns true if the specified property is dirty
 * - `model`: The original model object for which this viewModel was created
 *
 * N.B. doesn't support observable arrays and maps yet
 *
 * @example
 * class Todo {
 *   @observable title = "Test"
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
 */
export function createViewModel<T>(model: T): T & IViewModel<T> {
    return new ViewModel(model) as any;
}