const utils = require('../');
const mobx = require('mobx');
const test = require('tape');

mobx.useStrict(true);

test('sync processor should work with max', t => {
  const q = mobx.observable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const res = [];

  const stop = utils.chunkProcessor(q, v => res.push(v),0,3);

  t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10]]);
  t.equal(q.length, 0);

  mobx.runInAction(() => q.push(1,2,3,4,5));
  t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10], [1,2,3], [4,5]]);
  t.equal(q.length, 0);

  mobx.runInAction(() => q.push(3))
  t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10], [1,2,3], [4,5], [3]]);
  t.equal(q.length, 0);

  mobx.runInAction(() => q.push(8,9))
  t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10], [1,2,3], [4,5], [3], [8,9]]);
  t.equal(q.length, 0);

  mobx.runInAction(() => {
    q.unshift(6, 7);
    t.equal(q.length, 2);
    t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10], [1,2,3], [4,5], [3], [8,9]]);
  });
  t.equal(q.length, 0);
  t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10], [1,2,3], [4,5], [3], [8,9], [6, 7]]);

  stop();
  mobx.runInAction(() => q.push(42))
  t.equal(q.length, 1);
  t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10], [1,2,3], [4,5], [3], [8,9], [6, 7]]);

  t.end();
});

test('sync processor should work with default max', t => {
  const q = mobx.observable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const res = [];

  const stop = utils.chunkProcessor(q, v => res.push(v))

  t.deepEqual(res, [[1,2,3,4,5,6,7,8,9,10]]);
  t.equal(q.length, 0);

  mobx.runInAction(() => q.push(1,2,3,4,5))
  t.deepEqual(res, [[1,2,3,4,5,6,7,8,9,10], [1,2,3,4,5]]);
  t.equal(q.length, 0);

  t.end();
});

test('async processor should work', t => {
  const q = mobx.observable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const res = [];

  const stop = utils.chunkProcessor(q, v => res.push(v), 10, 3);

  t.equal(res.length, 0);
  t.equal(q.length, 10);

  setTimeout(() => {
    t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10]]);
    t.equal(q.length, 0);

    mobx.runInAction(() => q.push(3))
    t.equal(q.length, 1);
    t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10]]);

    setTimeout(() => {
      t.equal(q.length, 0);
      t.deepEqual(res, [[1,2,3], [4,5,6], [7,8,9], [10], [3]]);

      stop();
      t.end();
    }, 50);
  }, 50);

});


test('async processor should combine smaller chunks to max size', t => {
  const q = mobx.observable([1, 2]);
  const res = [];

  const stop = utils.chunkProcessor(q, v => res.push(v), 10, 3);

  t.equal(res.length, 0);
  t.equal(q.length, 2);
  mobx.runInAction(() =>q.push(3));
  mobx.runInAction(() =>q.push(4));
  mobx.runInAction(() =>q.push(5));
  mobx.runInAction(() =>q.push(6));
  mobx.runInAction(() =>q.push(7));

  setTimeout(() => {
    t.deepEqual(res, [[1,2,3], [4,5,6], [7]]);
    t.equal(q.length, 0);

    mobx.runInAction(() => q.push(8,9))
    setTimeout(() => {
      mobx.runInAction(() => q.push(10,11))
      t.equal(q.length, 4);
      t.deepEqual(res, [[1,2,3], [4,5,6], [7]]);
    }, 2);
    setTimeout(() => {
      mobx.runInAction(() => q.push(12,13))
      t.equal(q.length, 6);
      t.deepEqual(res, [[1,2,3], [4,5,6], [7]]);
    }, 4);

    t.equal(q.length, 2);
    t.deepEqual(res, [[1,2,3], [4,5,6], [7]]);

    setTimeout(() => {
      t.equal(q.length, 0);
      t.deepEqual(res, [[1,2,3], [4,5,6], [7], [8,9,10], [11,12,13]]);

      stop();
      t.end();
    }, 50);
  }, 50);

});
