export type IDisposer = () => void

export const NOOP = () => {}

export const IDENTITY = (_: any) => _

export function invariant(cond: boolean, message = "Illegal state") {
    if (!cond) throw new Error("[mobx-utils] " + message)
}

const deprecatedMessages: string[] = []
export function deprecated(msg: string) {
    if (deprecatedMessages.indexOf(msg) !== -1) return
    deprecatedMessages.push(msg)
    console.error("[mobx-utils] Deprecated: " + msg)
}

export function addHiddenProp(object: any, propName: string, value: any) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value
    })
}

const isProperty = (x: any, name: any) => (x.hasOwnProperty(name));
const isGetter = (x: any, name: any) => (Object.getOwnPropertyDescriptor(x, name) || {}).get
const isFunction = (x: any, name: any) => typeof x[name] === "function";
const deepFunctions = (x: any): any => 
  x && x !== Object.prototype && 
  Object.getOwnPropertyNames(x)
    .filter(name => isGetter(x, name) || isFunction(x, name) || isProperty(x, name))
    .concat(deepFunctions(Object.getPrototypeOf(x)) || []);
const distinctDeepFunctions = (x: any): any => Array.from(new Set(deepFunctions(x)));
export const getAllMethodsAndProperties = (x: any): any => distinctDeepFunctions(x).filter((name: string) => name !== "constructor" && !~name.indexOf("__"));
