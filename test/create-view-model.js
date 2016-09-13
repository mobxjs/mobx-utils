"use strict";

const utils = require("../");
const mobx = require("mobx");
const test = require("tape");

mobx.useStrict(true);

test("create view model", t => {
    function Todo(title, done, usersInterested) {
        mobx.extendObservable(this, {
            title: title,
            done: done,
            usersInterested: usersInterested,
        });
    }

    const model = new Todo("coffee", false, ["Vader", "Madonna"]);
    const viewModel = utils.createViewModel(model);

    let tr;
    let vr;
    // original rendering
    const d1 = mobx.autorun(() => {
        tr = model.title + ":" + model.done + ",interested:" + model.usersInterested.slice().toString();
    });
    // view model rendering
    const d2 = mobx.autorun(() => {
        vr = viewModel.title + ":" + viewModel.done + ",interested:" + viewModel.usersInterested.slice().toString();
    });

    t.equal(tr, "coffee:false,interested:Vader,Madonna")
    t.equal(vr, "coffee:false,interested:Vader,Madonna")
    t.pass(vr.usersInterested === tr.usersInterested)


    mobx.runInAction(() =>  model.title = "tea")
    t.equal(tr, "tea:false,interested:Vader,Madonna")
    t.equal(vr, "tea:false,interested:Vader,Madonna") // change reflected in view model
    t.equal(viewModel.isDirty, false)

    mobx.runInAction(() =>  model.usersInterested.push("Tarzan"))
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan")
    t.equal(vr, "tea:false,interested:Vader,Madonna,Tarzan") // change reflected in view model
    t.equal(viewModel.isDirty, false)

    mobx.runInAction(() =>  viewModel.done = true)
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan")
    t.equal(vr, "tea:true,interested:Vader,Madonna,Tarzan")
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), true)
    t.equal(viewModel.isPropertyDirty("usersInterested"), false)

    const newUsers = ["Putin", "Madonna", "Tarzan"];
    mobx.runInAction(() =>  viewModel.usersInterested = newUsers)
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan")
    t.equal(vr, "tea:true,interested:Putin,Madonna,Tarzan")
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), true)
    t.equal(viewModel.isPropertyDirty("usersInterested"), true)

    mobx.runInAction(() =>  model.usersInterested.push("Cersei"))
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan,Cersei")
    t.equal(vr, "tea:true,interested:Putin,Madonna,Tarzan") // change NOT reflected in view model bcs users are dirty
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), true)
    t.equal(viewModel.isPropertyDirty("usersInterested"), true)

    // should reset
    viewModel.reset();
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan,Cersei")
    t.equal(vr, "tea:false,interested:Vader,Madonna,Tarzan,Cersei")
    t.equal(viewModel.isDirty, false)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("usersInterested"), false)
    t.pass(vr.usersInterested === tr.usersInterested)

    mobx.runInAction(() =>  {model.usersInterested.pop();model.usersInterested.pop();})
    t.equal(tr, "tea:false,interested:Vader,Madonna")
    t.equal(vr, "tea:false,interested:Vader,Madonna")
    t.equal(viewModel.isDirty, false)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("usersInterested"), false)

    mobx.runInAction(() =>  {viewModel.title = "cola"; viewModel.usersInterested = newUsers;})
    t.equal(tr, "tea:false,interested:Vader,Madonna")
    t.equal(vr, "cola:false,interested:Putin,Madonna,Tarzan")
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("title"), true)
    t.equal(viewModel.isPropertyDirty("usersInterested"), true)

    // model changes should not update view model which is dirty
    mobx.runInAction(() =>  model.title = "coffee")
    t.equal(tr, "coffee:false,interested:Vader,Madonna")
    t.equal(vr, "cola:false,interested:Putin,Madonna,Tarzan")

    viewModel.submit();
    t.equal(tr, "cola:false,interested:Putin,Madonna,Tarzan")
    t.equal(vr, "cola:false,interested:Putin,Madonna,Tarzan")
    t.equal(viewModel.isDirty, false)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("usersInterested"), false)

    d1()
    d2()
    t.end()
})
