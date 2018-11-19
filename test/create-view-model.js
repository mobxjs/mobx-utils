"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

mobx.configure({ enforceActions: "observed" })

test("create view model", () => {
    function Todo(title, done, usersInterested) {
        mobx.extendObservable(this, {
            title: title,
            done: done,
            usersInterested: usersInterested,
            get usersCount() {
                return this.usersInterested.length
            }
        })
    }

    const model = new Todo("coffee", false, ["Vader", "Madonna"])
    const viewModel = utils.createViewModel(model)

    let tr
    let vr
    // original rendering
    const d1 = mobx.autorun(() => {
        tr =
            model.title +
            ":" +
            model.done +
            ",interested:" +
            model.usersInterested.slice().toString() +
            ",usersCount:" +
            model.usersCount
    })
    // view model rendering
    const d2 = mobx.autorun(() => {
        vr =
            viewModel.title +
            ":" +
            viewModel.done +
            ",interested:" +
            viewModel.usersInterested.slice().toString() +
            ",usersCount:" +
            viewModel.usersCount
    })

    expect(tr).toBe("coffee:false,interested:Vader,Madonna,usersCount:2")
    expect(vr).toBe("coffee:false,interested:Vader,Madonna,usersCount:2")

    mobx.runInAction(() => (model.title = "tea"))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,usersCount:2")
    expect(vr).toBe("tea:false,interested:Vader,Madonna,usersCount:2") // change reflected in view model
    expect(viewModel.isDirty).toBe(false)

    mobx.runInAction(() => model.usersInterested.push("Tarzan"))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,usersCount:3")
    expect(vr).toBe("tea:false,interested:Vader,Madonna,Tarzan,usersCount:3") // change reflected in view model
    expect(viewModel.isDirty).toBe(false)

    mobx.runInAction(() => (viewModel.done = true))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,usersCount:3")
    expect(vr).toBe("tea:true,interested:Vader,Madonna,Tarzan,usersCount:3")
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(true)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)
    expect(viewModel.isPropertyDirty("usersCount")).toBe(false)

    const newUsers = ["Putin", "Madonna", "Tarzan"]
    mobx.runInAction(() => (viewModel.usersInterested = newUsers))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,usersCount:3")
    expect(vr).toBe("tea:true,interested:Putin,Madonna,Tarzan,usersCount:3")
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(true)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(true)
    expect(viewModel.isPropertyDirty("usersCount")).toBe(false)

    mobx.runInAction(() => model.usersInterested.push("Cersei"))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,Cersei,usersCount:4")
    expect(vr).toBe("tea:true,interested:Putin,Madonna,Tarzan,usersCount:3") // change NOT reflected in view model bcs users are dirty
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(true)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(true)

    // should reset
    viewModel.reset()
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,Cersei,usersCount:4")
    expect(vr).toBe("tea:false,interested:Vader,Madonna,Tarzan,Cersei,usersCount:4")
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)

    mobx.runInAction(() => (viewModel.title = "beer"))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,Cersei,usersCount:4")
    expect(vr).toBe("beer:false,interested:Vader,Madonna,Tarzan,Cersei,usersCount:4")
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("title")).toBe(true)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)

    mobx.runInAction(() => viewModel.resetProperty("title"))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,Cersei,usersCount:4")
    expect(vr).toBe("tea:false,interested:Vader,Madonna,Tarzan,Cersei,usersCount:4")
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)

    mobx.runInAction(() => {
        model.usersInterested.pop()
        model.usersInterested.pop()
    })
    expect(tr).toBe("tea:false,interested:Vader,Madonna,usersCount:2")
    expect(vr).toBe("tea:false,interested:Vader,Madonna,usersCount:2")
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)

    mobx.runInAction(() => {
        viewModel.title = "cola"
        viewModel.usersInterested = newUsers
    })
    expect(tr).toBe("tea:false,interested:Vader,Madonna,usersCount:2")
    expect(vr).toBe("cola:false,interested:Putin,Madonna,Tarzan,usersCount:3")
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(true)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(true)

    // model changes should not update view model which is dirty
    mobx.runInAction(() => (model.title = "coffee"))
    expect(tr).toBe("coffee:false,interested:Vader,Madonna,usersCount:2")
    expect(vr).toBe("cola:false,interested:Putin,Madonna,Tarzan,usersCount:3")

    viewModel.submit()
    expect(tr).toBe("cola:false,interested:Putin,Madonna,Tarzan,usersCount:3")
    expect(vr).toBe("cola:false,interested:Putin,Madonna,Tarzan,usersCount:3")
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)

    d1()
    d2()
})
