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
    set: (value: T) => void;
}

/**
 * `throttledValue` creates an observable object which has two versions of its value; the 'latest' value that was applied,
 * and a 'current' value that is eventually synchronised with the latest, but is throttled by the specified amount. This 
 * is useful when the value can change rapidly, but you only want to 'apply' the value in a throttled manner.
 *
 * @example
 * const FilteredList = observer(({ filter, items }) => {
 *     // use the 'current' value as the actual filter value
 *     const filteredItems = items
 *        .filter((item) => item.indexOf(filter.current) !== -1)
 *        .map((item) => <li key={item}>{item}</li>);
 *  
 *     return (
 *         <div>
 *             // use the 'latest' value as the filter input value
 *             <input type='text' value={filter.latest} onInput={(ev) => filter.set(ev.currentTarget.value)} />
 *             <ul>
 *                 {filteredItems}
 *             </ul>
 *         </div>
 *     );
 * });
 *
 * // create the filter as a throttledValue which is throttled to synchronous at most once per second
 * const filter = throttledValue('', 1000);
 * const items = ['one', 'two', 'three', 'four', 'five', 'six'];
 * ReactDOM.render(<FilteredList filter={filter} items={items} />, document.getElementById('host'));
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
    let timeout = 0;
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
