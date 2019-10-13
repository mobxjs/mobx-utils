import { addHiddenProp } from "./utils"

type BabelDescriptor = PropertyDescriptor & { initializer?: () => any }

export function decorateMethodOrField(
    decoratorName: string,
    decorateFn: (pname: string, v: any) => any,
    target: object,
    prop: string,
    descriptor?: BabelDescriptor
) {
    if (descriptor) {
        return decorateMethod(decoratorName, decorateFn, prop, descriptor)
    } else {
        decorateField(decorateFn, target, prop)
    }
}

export function decorateMethod(
    decoratorName: string,
    decorateFn: (pname: string, v: any) => any,
    prop: string,
    descriptor: BabelDescriptor
) {
    if (descriptor.get !== undefined) {
        return fail(`${decoratorName} cannot be used with getters`)
    }

    // babel / typescript
    // @action method() { }
    if (descriptor.value) {
        // typescript
        return {
            value: decorateFn(prop, descriptor.value),
            enumerable: false,
            configurable: true, // See #1477
            writable: true // for typescript, this must be writable, otherwise it cannot inherit :/ (see inheritable actions test)
        }
    }

    // babel only: @action method = () => {}
    const { initializer } = descriptor
    return {
        enumerable: false,
        configurable: true, // See #1477
        writable: true, // See #1398
        initializer() {
            // N.B: we can't immediately invoke initializer; this would be wrong
            return decorateFn(prop, initializer!.call(this))
        }
    }
}

export function decorateField(
    decorateFn: (pname: string, v: any) => any,
    target: object,
    prop: string
) {
    // Simple property that writes on first invocation to the current instance
    Object.defineProperty(target, prop, {
        configurable: true,
        enumerable: false,
        get() {
            return undefined
        },
        set(value) {
            addHiddenProp(this, prop, decorateFn(prop, value))
        }
    })
}
