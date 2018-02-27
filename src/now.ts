import { _isComputingDerivation } from "mobx"
import { fromResource, IResource } from "./from-resource"

const tickers: {
    [interval: string]: IResource<number>
} = {}

/**
 * Returns the current date time as epoch number.
 * The date time is read from an observable which is updated automatically after the given interval.
 * So basically it treats time as an observable.
 *
 * The function takes an interval as parameter, which indicates how often `now()` will return a new value.
 * If no interval is given, it will update each second. If "frame" is specified, it will update each time a
 * `requestAnimationFrame` is available.
 *
 * Multiple clocks with the same interval will automatically be synchronized.
 *
 * Countdown example: https://jsfiddle.net/mweststrate/na0qdmkw/
 *
 * @example
 *
 * const start = Date.now()
 *
 * autorun(() => {
 *   console.log("Seconds elapsed: ", (mobxUtils.now() - start) / 1000)
 * })
 *
 *
 * @export
 * @param {(number | "frame")} [interval=1000] interval in milliseconds about how often the interval should update
 * @returns
 */
export function now(interval: number | "frame" = 1000) {
    if (!_isComputingDerivation()) {
        // See #40
        return Date.now()
    }
    if (!tickers[interval]) {
        if (typeof interval === "number") tickers[interval] = createIntervalTicker(interval)
        else tickers[interval] = createAnimationFrameTicker()
    }
    return tickers[interval].current()
}

function createIntervalTicker(interval: number): IResource<number> {
    let subscriptionHandle: any
    return fromResource<number>(
        sink => {
            subscriptionHandle = setInterval(() => sink(Date.now()), interval)
        },
        () => {
            clearInterval(subscriptionHandle)
        },
        Date.now()
    )
}

function createAnimationFrameTicker(): IResource<number> {
    let subscriptionHandle: number
    const frameBasedTicker = fromResource<number>(
        sink => {
            function scheduleTick() {
                window.requestAnimationFrame(() => {
                    sink(Date.now())
                    if (frameBasedTicker.isAlive()) scheduleTick()
                })
            }
            scheduleTick()
        },
        () => {},
        Date.now()
    )
    return frameBasedTicker
}
