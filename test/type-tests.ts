import {fromPromise, FULFILLED} from "../src/mobx-utils";

{
    // test typings of fromPromise
    const x = { x: 3 };
    const p = fromPromise(Promise.resolve(x));
    // p.value // compile error!
    if (p.state === FULFILLED) {
        p.value.x = 4; // value only available if state is checked!
    }
}