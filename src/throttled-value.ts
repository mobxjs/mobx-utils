import { observable, action } from 'mobx';

import { IDENTITY } from './utils';

export interface ThrottledValue<T> {
    // Gets or sets the `latest` value
    latest: T;
    
    // Gets the 'current' value
    readonly current: T;
    
    // Determines whether the `latest` and `current` values are in sync
    stale: boolean;
    
    // Sets the `latest` value
    set: (value: T) => undefined;
}

/**
 * `throttledValue` creates an observable object which has two versions of its value; the 'latest' value that was applied,
 * and a 'current' value that eventually matches the latest, but is throttled by the specified amount. This is useful when
 * the value can change rapidly, but you only want to 'apply' the value in a throttled manner.
 *
 * @param {T} [initialValue} the initial value
 * @param {T} [delay] the throttle delay for applying the latest value to the current value
 * @param {any} [modifier=IDENTITY] optional mobx modifier to apply to the observable
 * @returns {{
 *     latest: T;
 *     readonly current: T;
 *     stale: boolean;
 *     set: (value: T) => undefined;
 * }}
 */
export function throttledValue<T>(
    initialValue: T,
    delay: number,
    modifier = IDENTITY
): ThrottledValue<T> {    
    const values = observable({
        latest: modifier(initialValue),
        current: modifier(initialValue)
    });
    
    let lastUpdateTime = 0;
    let timeout = null;
    const set = action((value: T) => {
        values.latest = value;
        const sinceLastUpdate = Date.now() - lastUpdateTime;  
        const wait = Math.max(0, delay - sinceLastUpdate);
        if (!timeout) {
            timeout = setTimeout(action(() => {
                values.current = values.latest;
                lastUpdateTime = Date.now();
                timeout = null;
            }), wait);
        }
    });
    
    return {
        get latest() { return values.latest; },
        set latest(value: T) { set(value); },
        get current() { return values.current; },
        get stale() { return values.latest !== values.current; },
        set
    };
}
