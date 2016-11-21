'use strict';

const utils = require('../');
const mobx = require('mobx');
const test = require('tape');

mobx.useStrict(true);

test('sync processor should work', t => {
  const q = mobx.observable([1, 2]);
  const res = [];

  const stop = utils.queueProcessor(q, v => res.push(v * 2));

  t.deepEqual(res, [2, 4]);
  t.equal(q.length, 0);

  mobx.runInAction(() => q.push(3));
  t.deepEqual(res, [2, 4, 6]);

  mobx.runInAction(() => q.push(4, 5));
  t.equal(q.length, 0);
  t.deepEqual(res, [2, 4, 6, 8, 10]);

  mobx.runInAction(() => {
    q.unshift(6, 7);
    t.equal(q.length, 2);
    t.deepEqual(res, [2, 4, 6, 8, 10]);
  });

  t.equal(q.length, 0);
  t.deepEqual(res, [2, 4, 6, 8, 10, 12, 14]);

  stop();
  mobx.runInAction(() => q.push(42));
  t.equal(q.length, 1);
  t.deepEqual(res, [2, 4, 6, 8, 10, 12, 14]);

  t.end();
});

test('async processor should work', t => {
  const q = mobx.observable([1, 2]);
  const res = [];

  const stop = utils.queueProcessor(q, v => res.push(v * 2), 10);

  t.equal(res.length, 0);
  t.equal(q.length, 2);

  setTimeout(() => {
    t.deepEqual(res, [2, 4]);
    t.equal(q.length, 0);

    mobx.runInAction(() => q.push(3));
    t.equal(q.length, 1);
    t.deepEqual(res, [2, 4]);

    setTimeout(() => {
      t.equal(q.length, 0);
      t.deepEqual(res, [2, 4, 6]);

      stop();
      t.end();
    }, 50);
  }, 50);

});
