import {
  action,
  IObservableValue,
  isObservable,
  isObservableArray,
  isObservableMap,
  isObservableObject,
  observable,
  remove,
  set
} from "mobx"

type LocalObservables = WeakMap<any, boolean>

export type UpdateableObservableMode<T> =
  | "shallow" // the reference is not changed and the properties (primitives, objects, maps and arrays) are turned into a shallowly observable values
  | "deep" // the reference is not changed and properties (primitives, objects, maps and arrays) are turned into a deeply observable values
  | (T extends object
        ? {
              deepProps: Array<keyof T> // like 'shallow', except some properties are turned into deep observables 'opt-in'
          }
        : never)

export interface IUpdateableObservable<T> {
  get(): T
  getBoxed(): T | IObservableValue<T>
  update(props: T): void
}

const alwaysDeep = () => true
const alwaysShallow = () => false

const invalidModeError = "mode has to be one of 'shallow', 'deep' or '{ deepProps }'"

/**
 * `updateableObservable` takes a non observable (or observable) value and turns it into
 * an observable that can be later updated with another non-observable (or observable) value
 * while trying to keep observable object references the same as much as possible.
 * 
 * Think of this as an observable with support for a "smart" deep merge.
 * This is useful for example when there's a big object coming from a back-end call,
 * yet you'd like to only trigger the minimum amount of reactions possibles (the ones with
 * actual changes).
 * 
 * The returned value will have two methods:
 * - `get()` returns the value of the observable
 * - `update(newValue)`: use this to update the current observable with the new value
 * 
 * The first parameter is the inital value the updateable observable should take.
 * 
 * The second parameter (update mode) can take one of the folowing values:
 * - `"shallow"`: properties (primitives, objects, maps and arrays) are turned into a shallowly observable values
 * - `"deep"`: properties (primitives, objects, maps and arrays) are turned into a deeply observable values
 * - `{ deepProps: [keys] }`: like 'shallow', except some properties are turned into deep observables 'opt-in'
 * 
 * @example
 * const backendTodoList = ... // a plain array with list of plain todo objects
 * const todoList = updateableObservable(backendTodoList, "deep")
 * // new todo list comes from backend
 * todoList.update(newBackendTodoList)
 * // get the observable value
 * todoList.get()
 *
 * @param {T} initialValue
 * @param {UpdateableObservableMode<T>} mode
 * @returns {IUpdateableObservable<T>}
 */
export function updateableObservable<T>(
  initialValue: T,
  mode: UpdateableObservableMode<T>
): IUpdateableObservable<T> {
  let isDeepProp: (pname: string) => boolean
  if (mode === "deep") {
      isDeepProp = alwaysDeep
  } else if (mode === "shallow") {
      isDeepProp = alwaysShallow
  } else if (isPlainObject(mode)) {
      const modeDeepProps = mode.deepProps as string[]
      if (!Array.isArray(modeDeepProps)) {
          // istanbul ignore next
          throw new Error(invalidModeError)
      }

      // convert array to object so lookup is faster
      const deepProps: { [pname: string]: boolean } = {}
      modeDeepProps.forEach(propName => {
          deepProps[propName] = true
      })

      isDeepProp = propName => deepProps[propName]
  } else {
      // istanbul ignore next
      throw new Error(invalidModeError)
  }

  // keeps track of which observable comes from props and which were generated locally
  const localObservables = new WeakMap()

  let observed: any
  let boxed = false

  const update = action("updateObservable", (unobserved: T) => {
      observed = updateObservableValue(observed, unobserved, isDeepProp, localObservables)
      if (!isObservable(observed)) {
          boxed = true
          observed = observable.box(observed, { deep: false })
      } else {
          boxed = false
      }
      localObservables.set(observed, true)
  })

  update(initialValue)

  return {
      get() {
          if (boxed) {
              return observed.get()
          }
          return observed
      },
      getBoxed() {
          return observed
      },
      update
  }
}

function updateObservableValue(
  oldV: any,
  newV: any,
  isDeepProp: undefined | ((pname: string) => boolean),
  localObservables: LocalObservables
) {
  if (isObservable(newV)) {
      return newV
  }
  if (Array.isArray(newV)) {
      return updateObservableArray(oldV, newV, localObservables)
  }
  if (isPlainObject(newV)) {
      return updateObservableObject(oldV, newV, isDeepProp, localObservables)
  }
  if (newV instanceof Map) {
      return updateObservableMap(oldV, newV, localObservables)
  }
  return newV
}

function updateObservableArray(oldArr: any, newArr: any[], localObservables: LocalObservables) {
  if (!isObservableArray(oldArr) || !localObservables.has(oldArr)) {
      oldArr = observable.array([], { deep: false })
      localObservables.set(oldArr, true)
  }

  // add/update items
  const len = newArr.length
  oldArr.length = len
  for (let i = 0; i < len; i++) {
      const oldValue = oldArr[i]
      const newValue = newArr[i]

      if (oldValue !== newValue) {
          set(oldArr, i, updateObservableValue(oldValue, newValue, undefined, localObservables))
      }
  }

  return oldArr
}

function updateObservableMap(
  oldMap: any,
  newMap: Map<any, any>,
  localObservables: LocalObservables
) {
  if (!isObservableMap(oldMap) || !localObservables.has(oldMap)) {
      oldMap = observable.map({}, { deep: false })
      localObservables.set(oldMap, true)
  }

  const oldMapKeysToRemove = new Set(oldMap.keys())

  // add/update props
  newMap.forEach((newValue, propName) => {
      oldMapKeysToRemove.delete(propName)
      const oldValue = oldMap.get(propName)

      if (oldValue !== newValue) {
          set(
              oldMap,
              propName,
              updateObservableValue(oldValue, newValue, undefined, localObservables)
          )
      }
  })

  // remove missing props
  oldMapKeysToRemove.forEach(propName => {
      remove(oldMap, propName)
  })

  return oldMap
}

function updateObservableObject(
  oldObj: any,
  newObj: any,
  isDeepProp: undefined | ((pname: string) => boolean),
  localObservables: LocalObservables
) {
  if (!isObservableObject(oldObj) || !localObservables.has(oldObj)) {
      oldObj = observable.object({}, undefined, { deep: false })
      localObservables.set(oldObj, true)
  }

  const oldObjKeysToRemove = new Set(Object.keys(oldObj))

  // add/update props
  Object.keys(newObj).forEach(propName => {
      oldObjKeysToRemove.delete(propName)
      const maybeNewValue = newObj[propName]
      const oldValue = oldObj[propName]

      const newValue =
          isDeepProp && !isDeepProp(propName)
              ? maybeNewValue
              : updateObservableValue(oldValue, maybeNewValue, undefined, localObservables)

      if (oldValue !== newValue) {
          set(oldObj, propName, newValue)
      }
  })

  // remove missing props
  oldObjKeysToRemove.forEach(propName => {
      remove(oldObj, propName)
  })

  return oldObj
}

function isPlainObject(value: any): value is object {
  if (value === null || typeof value !== "object") {
      return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}
