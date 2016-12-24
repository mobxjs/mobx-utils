'use strict';

const utils = require('../');
const mobx = require('mobx');
const test = require('tape');
const Rx = require("rxjs");


test("to observable", t => {
  const user = mobx.observable({
    firstName: "C.S",
    lastName: "Lewis"
  })

  mobx.useStrict(false);

  let values = []

  const sub = Rx.Observable
    .from(utils.toStream(() => user.firstName + user.lastName))
    .map(x => x.toUpperCase())
    .subscribe(v => values.push(v))

  user.firstName = "John"

  mobx.transaction(() => {
    user.firstName = "Jane";
    user.lastName = "Jack";
  })

  sub.unsubscribe();

  user.firstName = "error";

  t.deepEqual(values, [
    "JOHNLEWIS",
    "JANEJACK"
  ]);

  t.end();
})

test("from observable", t => {
  const fromStream = utils.fromStream(Rx.Observable.interval(100), -1)
  const values = [];
  const d = mobx.autorun(() => {
    values.push(fromStream.current);
  })


  setTimeout(() => {
    t.equal(fromStream.current, -1)
  }, 50)
  setTimeout(() => {
    t.equal(fromStream.current, 0)
  }, 150)
  setTimeout(() => {
    t.equal(fromStream.current, 1)
    fromStream.dispose()
  }, 250)
  setTimeout(() => {
    t.equal(fromStream.current, 1)
    t.deepEqual(values, [-1, 0, 1])
    d()
    t.end()
  }, 350)
})
