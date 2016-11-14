'use strict';

const utils = require('../');
const mobx = require('mobx');
const test = require('tape');

mobx.useStrict(true);

test('whenWithTimeout should operate normally', t => {
  var a = mobx.observable(1);

  utils.whenWithTimeout(
    () => a.get() === 2,
    () => t.end(),
    500,
    () => t.fail()
  )

  setTimeout(mobx.action(() => a.set(2)), 200);
});

test('whenWithTimeout should timeout', t => {
  const a = mobx.observable(1)

  utils.whenWithTimeout(
    () => a.get() === 2,
    () => t.fail('should have timed out'),
    500,
    () => t.end()
  )

  setTimeout(mobx.action(() => a.set(2)), 1000);
});

test('whenWithTimeout should dispose', t => {
  const a = mobx.observable(1)

  const d1 = utils.whenWithTimeout(
    () => a.get() === 2,
    () => t.fail('1 should not finsih'),
    100,
    () => t.fail('1 should not timeout')
  )

  const d2 = utils.whenWithTimeout(
    () => a.get() === 2,
    () => t.fail('2 should not finsih'),
    200,
    () => t.fail('2 should not timeout')
  );

  d1();
  d2();

  setTimeout(mobx.action(() => {
    a.set(2);
    t.end();
  }), 150);
});
