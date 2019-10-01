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

const deepFunctions = (x: any): any => {
    return x && x !== Object.prototype && Object.getOwnPropertyNames(x).concat(deepFunctions(Object.getPrototypeOf(x)) || []);
}
const distinctDeepFunctions = (x: any) => {
    const deepFunctionsIndistinct = deepFunctions(x);
    const deepFunctionsDistinct = deepFunctionsIndistinct.filter((item: any, index: number) => deepFunctionsIndistinct.indexOf(item) === index);
    return deepFunctionsDistinct;
};
export const getAllMethodsAndProperties = (x: any): any => distinctDeepFunctions(x).filter((name: string) => name !== "constructor" && !~name.indexOf("__"));
