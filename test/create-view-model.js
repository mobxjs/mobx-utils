"use strict";

const utils = require("../");
const mobx = require("mobx");
const test = require("tape");

mobx.useStrict(true);

test("create view model", t => {
    function Todo(title, done) {
        mobx.extendObservable(this, {
            title: title,
            done: done
        });
    }

    const model = new Todo("coffee", false);
    const viewModel = utils.createViewModel(model);
    let tr;
    let vr;
    // original rendering
    const d1 = mobx.autorun(() => {
        tr = model.title + ":" + model.done;
    });
    // view model rendering
    const d2 = mobx.autorun(() => {
        vr = viewModel.title + ":" + viewModel.done;
    });

    t.equal(tr, "coffee:false")
    t.equal(vr, "coffee:false")

    mobx.runInAction(() =>  model.title = "tea")
    t.equal(tr, "tea:false")
    t.equal(vr, "tea:false") // change reflected in view model
    t.equal(viewModel.isDirty, false)

    mobx.runInAction(() =>  viewModel.done = true)
    t.equal(tr, "tea:false")
    t.equal(vr, "tea:true")
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), true)

    // should reset
    viewModel.reset();
    t.equal(tr, "tea:false")
    t.equal(vr, "tea:false")
    t.equal(viewModel.isDirty, false)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), false)

    mobx.runInAction(() =>  viewModel.title = "cola")
    t.equal(tr, "tea:false")
    t.equal(vr, "cola:false")
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("title"), true)

    // model changes should not update view model which is dirty
    mobx.runInAction(() =>  model.title = "coffee")
    t.equal(tr, "coffee:false")
    t.equal(vr, "cola:false")

    viewModel.submit();
    t.equal(tr, "cola:false")
    t.equal(vr, "cola:false")
    t.equal(viewModel.isDirty, false)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("title"), false)

    d1()
    d2()
    t.end()
})
