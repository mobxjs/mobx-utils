"use strict";

const utils = require("../");
const mobx = require("mobx");
const test = require("tape");

mobx.useStrict(true);

test("lazy observable should work", t => {
    let started = false;
    const lo = utils.lazyObservable(
        sink => {
            started = true;
            setTimeout(() => sink(4), 50)
            setTimeout(() => sink(5), 100)
            setTimeout(() => sink(6), 150)
        },
        3
    );

    const values = [];
    t.equal(started, false)

    const stop = mobx.autorun(() => {
        values.push(lo.current());
    })

    t.equal(started, true)
    t.deepEqual(values, [3])
    t.equal(lo.current(), 3)

    setTimeout(() => {
        t.equal(lo.current(), 6);
        t.deepEqual(values, [3, 4, 5, 6])
        t.end();
    }, 200)
})

test("lazy observable refresh", t => {
    let started = 0;
    let i = 10;
    
    const lo = utils.lazyObservable(
        sink => new Promise((resolve, reject) => {
                    started = started + 1;
                    resolve(i);
                    i++;
                }).then(value =>  {
                    sink(value)
                }),
            1
        );
    
    let values = [];
    const stop = mobx.autorun(() => {
        values.push(lo.current());
    })

    t.equal(started, 1)
    t.deepEqual(values, [1])
    t.equal(lo.current(), 1)

    setTimeout(() => {
        lo.refresh();
    }, 50)

    setTimeout(() => {
        t.equal(started, 2);
        t.equal(lo.current(), 11);
        t.deepEqual(values, [1, 10, 11]);
        t.end();
    }, 200)
})
