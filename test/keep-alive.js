"use strict";

const utils = require("../");
const mobx = require("mobx");
const test = require("tape");

mobx.useStrict(true);

test("keep alive should work for computeds", t => {
    const a = mobx.observable(1);
    let calcs = 0;
    const doubler = mobx.computed(() => {
        calcs++;
        return a.get() * 2
    });

    doubler.get();
    doubler.get();
    t.equal(calcs, 2);

    mobx.runInAction(() => a.set(2))
    t.equal(calcs, 2);

    const disposer = utils.keepAlive(doubler);
    t.equal(doubler.get(), 4);
    doubler.get();
    t.equal(calcs, 3);

    mobx.runInAction(() => a.set(4))
    t.equal(calcs, 4);

    t.equal(doubler.get(), 8);
    doubler.get();

    t.equal(calcs, 4);

    disposer();

    doubler.get();
    doubler.get();

    t.equal(calcs, 6);

    t.end();
})


test("keep alive should work for properties", t => {
    let calcs = 0;
    const x = mobx.observable({
        a: 1,
        doubler: function() {
            calcs++;
            return this.a * 2
        }
    });

    x.doubler;
    x.doubler;
    t.equal(calcs, 2);

    mobx.runInAction(() => x.a = 2)
    t.equal(calcs, 2);

    const disposer = utils.keepAlive(x, "doubler");
    x.doubler;
    t.equal(x.doubler, 4);
    t.equal(calcs, 3);

    mobx.runInAction(() => x.a = 4)
    t.equal(calcs, 4);

    t.equal(x.doubler, 8);
    x.doubler;

    t.equal(calcs, 4);

    disposer();

    x.doubler;
    x.doubler;

    t.equal(calcs, 6);

    t.end();
})
