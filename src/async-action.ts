import {runInAction, action} from "mobx";
import {invariant} from "./utils";

// TODO: move async-action to mobx-core?

// method decorator:
export function asyncAction(target: Object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;

// non-decorator forms
export function asyncAction<R>(generator: () => IterableIterator<any>): () => Promise<R>;
export function asyncAction<A1>(generator: (a1: A1) => IterableIterator<any>): (a1: A1) => Promise<any>; // Ideally we want to have R instead of Any, but cannot specify R without specifying A1 etc... 'any' as result is better then not specifying request args
export function asyncAction<A1, A2, A3, A4, A5, A6, A7, A8>(generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => Promise<any>;
export function asyncAction<A1, A2, A3, A4, A5, A6, A7>(generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => Promise<any>;
export function asyncAction<A1, A2, A3, A4, A5, A6>(generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => Promise<any>;
export function asyncAction<A1, A2, A3, A4, A5>(generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => Promise<any>;
export function asyncAction<A1, A2, A3, A4>(generator: (a1: A1, a2: A2, a3: A3, a4: A4) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4) => Promise<any>;
export function asyncAction<A1, A2, A3>(generator: (a1: A1, a2: A2, a3: A3) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3) => Promise<any>;
export function asyncAction<A1, A2>(generator: (a1: A1, a2: A2) => IterableIterator<any>): (a1: A1, a2: A2) => Promise<any>;
export function asyncAction<A1>(generator: (a1: A1) => IterableIterator<any>): (a1: A1) => Promise<any>;
// ... with name
export function asyncAction<R>(name: string, generator: () => IterableIterator<any>): () => Promise<R>;
export function asyncAction<A1>(name: string, generator: (a1: A1) => IterableIterator<any>): (a1: A1) => Promise<any>; // Ideally we want to have R instead of Any, but cannot specify R without specifying A1 etc... 'any' as result is better then not specifying request args
export function asyncAction<A1, A2, A3, A4, A5, A6, A7, A8>(name: string, generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => Promise<any>;
export function asyncAction<A1, A2, A3, A4, A5, A6, A7>(name: string, generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => Promise<any>;
export function asyncAction<A1, A2, A3, A4, A5, A6>(name: string, generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => Promise<any>;
export function asyncAction<A1, A2, A3, A4, A5>(name: string, generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => Promise<any>;
export function asyncAction<A1, A2, A3, A4>(name: string, generator: (a1: A1, a2: A2, a3: A3, a4: A4) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4) => Promise<any>;
export function asyncAction<A1, A2, A3>(name: string, generator: (a1: A1, a2: A2, a3: A3) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3) => Promise<any>;
export function asyncAction<A1, A2>(name: string, generator: (a1: A1, a2: A2) => IterableIterator<any>): (a1: A1, a2: A2) => Promise<any>;
export function asyncAction<A1>(name: string, generator: (a1: A1) => IterableIterator<any>): (a1: A1) => Promise<any>;

export function asyncAction(arg1: any, arg2?: any): any {
    // decorator
    if (typeof arguments[1] === "string") {
        const name = arguments[1];
        const descriptor: PropertyDescriptor = arguments[2];
        if (descriptor && descriptor.value) {
            return Object.assign({}, descriptor, { value: createAsyncActionGenerator(name, descriptor.value) });
        } else {
            return Object.assign({}, descriptor, { set(v: any) {
                Object.defineProperty(this, name, { ...descriptor, value: asyncAction(name, v) });
            }});
        }
    }

    // direct invocation
    const generator = typeof arg1 === "string" ? arg2 : arg1;
    const name = typeof arg1 === "string" ? arg1 : (generator.name || "<unnamed async action>");

    invariant(typeof generator === "function", "asyncAction expects function as first arg, got: " + generator);
    return createAsyncActionGenerator(name, generator);
}

let generatorId = 0;

export function createAsyncActionGenerator(name: string, generator: Function) {
    // Implementation based on https://github.com/tj/co/blob/master/index.js
    return function() {
        const ctx = this;
        const args = arguments;
        return new Promise(function(resolve, reject) {
            const runId = ++generatorId;
            let stepId = 0;
            const gen = action(`${name} - runid: ${runId} - init`, generator).apply(ctx, args);
            onFulfilled(undefined); // kick off the process

            function onFulfilled(res: any) {
                let ret;
                try {
                    ret = action(`${name} - runid: ${runId} - yield ${stepId}`, gen.next).call(gen, res);
                } catch (e) {
                    return reject(e);
                }
                next(ret);
                return null;
            }

            function onRejected(err: any) {
                let ret;
                try {
                    ret = action(`${name} - runid: ${runId} - yield ${stepId}`, gen.throw).call(gen, err);
                } catch (e) {
                    return reject(e);
                }
                next(ret);
            }

            function next(ret: any) {
                if (ret.done) return resolve(ret.value);
                // TODO: support more type of values? See https://github.com/tj/co/blob/249bbdc72da24ae44076afd716349d2089b31c4c/index.js#L100
                invariant(ret.value && typeof ret.value.then === "function", "Only promises can be yielded to asyncAction, got: " + ret);
                return ret.value.then(onFulfilled, onRejected);
            }
        });
    };
}
