import * as utils from "../src/mobx-utils";
import * as mobx from "mobx";

function delay<T>(time: number, value: T, shouldThrow = false): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldThrow) reject(value);
      else resolve(value);
    }, time);
  });
}

test("it should support async generator actions", done => {
  mobx.useStrict(true);
  const values: any[] = [];
  const x = mobx.observable({ a: 1 });
  mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true });

  const f = utils.asyncAction(function*(initial: number) {
    x.a = initial; // this runs in action
    x.a = yield delay(100, 3); // and this as well!
    yield delay(100, 0);
    x.a = 4;
    return x.a;
  });

  setTimeout(() => {
    f(2).then((v: number) => {
      // note: ideally, type of v should be inferred..
      expect(v).toBe(4);
      expect(values).toEqual([1, 2, 3, 4]);
      done();
    });
  }, 10);
});

test("it should support try catch in async generator", done => {
  mobx.useStrict(true);
  const values: any[] = [];
  const x = mobx.observable({ a: 1 });
  mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true });

  const f = utils.asyncAction(function*(initial: number) {
    x.a = initial; // this runs in action
    try {
      x.a = yield delay(100, 5, true); // and this as well!
      yield delay(100, 0);
      x.a = 4;
    } catch (e) {
      x.a = e;
    }
    return x.a;
  });

  setTimeout(() => {
    f(2).then((v: number) => {
      // note: ideally, type of v should be inferred..
      expect(v).toBe(5);
      expect(values).toEqual([1, 2, 5]);
      done();
    });
  }, 10);
});

test("it should support throw from async generator", done => {
  utils.asyncAction(function*() {
    throw 7;
  })().then(
    () => {
      fail();
      done();
    },
    e => {
      expect(e).toBe(7);
      done();
    }
  );
});

test("it should support throw from yielded promise generator", done => {
  utils.asyncAction(function*() {
    return yield delay(10, 7, true);
  })().then(
    () => {
      fail();
      done();
    },
    e => {
      expect(e).toBe(7);
      done();
    }
  );
});

test("it should support asyncAction as decorator", done => {
  const values: any[] = [];

  mobx.useStrict(true);

  class X {
    @mobx.observable a = 1;

    @utils.asyncAction
    *f(initial: number) {
      this.a = initial; // this runs in action
      try {
        this.a = yield delay(100, 5, true); // and this as well!
        yield delay(100, 0);
        this.a = 4;
      } catch (e) {
        this.a = e;
      }
      return this.a;
    }
  }

  const x = new X();
  mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true });

  setTimeout(() => {
    // TODO: mweh on any cast...
    (x.f(/*test binding*/ 2) as any).then((v: number) => {
      // note: ideally, type of v should be inferred..
      expect(v).toBe(5);
      expect(values).toEqual([1, 2, 5]);
      expect(x.a).toBe(5); // correct instance modified?
      done();
    });
  }, 10);
});

test("it should support logging", done => {
  mobx.useStrict(true);
  const events: any[] = [];
  const x = mobx.observable({ a: 1 });

  const f = utils.asyncAction("myaction", function*(initial: number) {
    x.a = initial;
    x.a = yield delay(100, 5);
    x.a = 4;
    x.a = yield delay(100, 3);
    return x.a;
  });
  const d = mobx.spy(ev => events.push(ev));

  setTimeout(() => {
    f(2).then(() => {
      expect(stripEvents(events)).toEqual([
        {
          arguments: [2],
          name: "myaction - runid: 6 - init",
          spyReportStart: true,
          type: "action"
        },
        { spyReportEnd: true },
        {
          arguments: [undefined],
          name: "myaction - runid: 6 - yield 0",
          spyReportStart: true,
          type: "action"
        },
        {
          name: "a",
          newValue: 2,
          oldValue: 1,
          spyReportStart: true,
          type: "update"
        },
        { spyReportEnd: true },
        { spyReportEnd: true },
        {
          arguments: [5],
          name: "myaction - runid: 6 - yield 1",
          spyReportStart: true,
          type: "action"
        },
        {
          name: "a",
          newValue: 5,
          oldValue: 2,
          spyReportStart: true,
          type: "update"
        },
        { spyReportEnd: true },
        {
          name: "a",
          newValue: 4,
          oldValue: 5,
          spyReportStart: true,
          type: "update"
        },
        { spyReportEnd: true },
        { spyReportEnd: true },
        {
          arguments: [3],
          name: "myaction - runid: 6 - yield 2",
          spyReportStart: true,
          type: "action"
        },
        {
          name: "a",
          newValue: 3,
          oldValue: 4,
          spyReportStart: true,
          type: "update"
        },
        { spyReportEnd: true },
        { spyReportEnd: true }
      ]);
      d();
      done();
    });
  }, 10);
});

test("it should support asyncActionWithCancel(cb, type) as decorator for have-value variable", t => {
    const values: any[] = []

    mobx.useStrict(true)

    class X {
        @mobx.observable a = 1;

        @utils.asyncActionWithCancel(() => {}, 'takeLatest')
        *f(initial: number) {
            this.a = initial // this runs in action
            try {
                this.a = yield delay(100, 5, true) // and this as well!
                yield delay(100, 0)
                this.a = 4
            } catch (e) {
                this.a = e
            }
            return this.a
        }
    }

    const x = new X()
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    setTimeout(() => {
        // TODO: mweh on any cast...
        ;(x.f(/*test binding*/ 2) as any).then((v: number) => {
            // note: ideally, type of v should be inferred..
            t.is(v, 5)
            t.deepEqual(values, [1, 2, 5])
            t.is(x.a, 5) // correct instance modified?
            t.end()
        })
    }, 10)
})

test("it should support asyncActionWithCancel(cb, type) as decorator for no-value variable", t => {
    const values: any[] = []

    mobx.useStrict(true)

    class X {
        @mobx.observable a = 1;

        @utils.asyncActionWithCancel(() => {}, 'takeLatest')
        noValueParam
    }

    const x = new X()
    x.noValueParam = function *(initial: number) {
        this.a = initial // this runs in action
        try {
            this.a = yield delay(100, 5, true) // and this as well!
            yield delay(100, 0)
            this.a = 4
        } catch (e) {
            this.a = e
        }
        return this.a
    }

    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    setTimeout(() => {
        // TODO: mweh on any cast...
        ;(x.noValueParam(/*test binding*/ 2) as any).then((v: number) => {
            // note: ideally, type of v should be inferred..
            t.is(v, 5)
            t.deepEqual(values, [1, 2, 5])
            t.is(x.a, 5) // correct instance modified?
            t.end()
        })
    }, 10)
})

test("it should support canceling the effects when call canceler", t => {
    mobx.useStrict(true)
    const values: any[] = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    let canceler
    const f = utils.asyncActionWithCancel(cancel => canceler = cancel)(function*(initial: number) {
        x.a = initial // this runs in action
        try {
            x.a = yield delay(1000, 5, true) // and this as well!
        } catch (e) {
            x.a = e
        }
        return x.a
    })

    setTimeout(() => {
        f(2)
        setTimeout(() => {
            canceler()
            t.is(x.a, 2)
            t.deepEqual(values, [1, 2])
            t.end()
        }, 150)
    }, 10)
})

test("it should support canceling prev the same kinds of async generator actions in 'takeLatest' type", t => {
    mobx.useStrict(true)
    const values: any[] = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    const f = utils.asyncActionWithCancel(() => {}, 'takeLatest')(function*(initial: number) {
        x.a = initial // this runs in action
        x.a = yield delay(100, 3) // and this as well!
        yield delay(100, 0)
        x.a = 4
        return x.a
    })

    setTimeout(() => {
        f(2)
        f(3)
        f(5).then((v: number) => {
            // note: ideally, type of v should be inferred..
            t.is(v, 4)
            t.deepEqual(values, [1, 2, 3, 5, 3, 4])
            t.end()
        })
    }, 10)
})

test("it should support canceling current async generator actions in 'takeLatest' type", t => {
    mobx.useStrict(true)
    const values: any[] = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    let canceler
    const f = utils.asyncActionWithCancel(cancel => canceler = cancel, 'takeLatest')(function*(initial: number) {
        x.a = initial // this runs in action
        x.a = yield delay(100, 3) // and this as well!
        yield delay(100, 0)
        x.a = 4
        return x.a
    })

    setTimeout(() => {
        f(2)
        f(3)
        f(5)
        canceler()
        setTimeout(() => {
            t.is(x.a, 5)
            t.deepEqual(values, [1, 2, 3, 5])
            t.end()
        }, 10)
    }, 10)
})

test("it should support canceling all the same kinds of async generator actions in 'takeEvery' type", t => {
    mobx.useStrict(true)
    const values: any[] = []
    const x = mobx.observable({ a: 1 })
    mobx.reaction(() => x.a, v => values.push(v), { fireImmediately: true })

    let canceler
    const f = utils.asyncActionWithCancel(cancel => canceler = cancel, 'takeEvery')(function*(initial: number) {
        x.a = initial // this runs in action
        x.a = yield delay(100, 3) // and this as well!
        yield delay(100, 0)
        x.a = 4
        return x.a
    })

    setTimeout(() => {
        f(2)
        f(3)
        f(5)
        canceler()
        setTimeout(() => {
            t.is(x.a, 5)
            t.deepEqual(values, [1, 2, 3, 5])
            t.end()
        }, 10)
    }, 10)
})

function stripEvents(events) {
  return events.map(e => {
    delete e.object;
    delete e.fn;
    delete e.time;
    return e;
  });
}
