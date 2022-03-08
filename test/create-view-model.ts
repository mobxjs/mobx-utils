import * as utils from "../src/mobx-utils"
import * as mobx from "mobx"
import { ViewModel } from "../src/create-view-model"

mobx.configure({ enforceActions: "observed" })

class TodoClass {
    @mobx.observable title: string
    @mobx.observable done: boolean
    @mobx.observable usersInterested: string[]
    unobservedProp: string
    @mobx.computed
    get usersCount(): number {
        return this.usersInterested.length
    }
    @mobx.computed
    get prefixedTitle() {
        return "Strong" + this.title
    }
    set prefixedTitle(value) {
        this.title = value.substr(6)
    }
    constructor() {
        mobx.makeObservable(this)
    }
}

class TodoViewModel extends ViewModel<TodoClass> {
    get prefixedTitle() {
        return "Overriden " + this.model.title
    }
}

function Todo(title, done, usersInterested, unobservedProp) {
    this.unobservedProp = unobservedProp
    mobx.extendObservable(this, {
        title: title,
        done: done,
        usersInterested: usersInterested,
        get usersCount() {
            return this.usersInterested.length
        },
        get prefixedTitle() {
            return "Strong" + this.title
        },
        set prefixedTitle(value) {
            this.title = value.substr(6)
        },
    })
}

test("test NON Class/decorator createViewModel behaviour", () => {
    const model = new Todo("coffee", false, ["Vader", "Madonna"], "testing")
    tests(model)
})

test("test Class/decorator createViewModel behaviour", () => {
    const model = new TodoClass()
    model.title = "coffee"
    model.done = false
    model.usersInterested = ["Vader", "Madonna"]
    model.unobservedProp = "testing"
    tests(model)
})

test("test view model overriden properties", () => {
    const model = new TodoClass()
    model.title = "coffee"
    model.done = false
    model.usersInterested = ["Vader", "Madonna"]
    model.unobservedProp = "testing"
    const viewModel = new TodoViewModel(model)
    expect(viewModel.prefixedTitle).toBe("Overriden coffee")
})

function tests(model) {
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
            ",unobservedProp:" +
            model.unobservedProp +
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
            ",unobservedProp:" +
            viewModel.unobservedProp +
            ",usersCount:" +
            viewModel.usersCount
    })

    expect(tr).toBe("coffee:false,interested:Vader,Madonna,unobservedProp:testing,usersCount:2")
    expect(vr).toBe("coffee:false,interested:Vader,Madonna,unobservedProp:testing,usersCount:2")

    mobx.runInAction(() => (model.title = "tea"))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,unobservedProp:testing,usersCount:2")
    expect(vr).toBe("tea:false,interested:Vader,Madonna,unobservedProp:testing,usersCount:2") // change reflected in view model
    expect(viewModel.isDirty).toBe(false)

    mobx.runInAction(() => model.usersInterested.push("Tarzan"))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,unobservedProp:testing,usersCount:3")
    expect(vr).toBe("tea:false,interested:Vader,Madonna,Tarzan,unobservedProp:testing,usersCount:3") // change reflected in view model
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.changedValues.size).toBe(0)

    mobx.runInAction(() => (viewModel.done = true))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,unobservedProp:testing,usersCount:3")
    expect(vr).toBe("tea:true,interested:Vader,Madonna,Tarzan,unobservedProp:testing,usersCount:3")
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(true)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)
    expect(viewModel.isPropertyDirty("unobservedProp")).toBe(false)
    expect(viewModel.isPropertyDirty("usersCount")).toBe(false)
    expect(viewModel.changedValues.has("done")).toBe(true)

    mobx.runInAction(() => (model.unobservedProp = "testing testing"))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,unobservedProp:testing,usersCount:3") // change NOT reflected in model
    expect(vr).toBe("tea:true,interested:Vader,Madonna,Tarzan,unobservedProp:testing,usersCount:3") // change NOT reflected in view model
    expect(viewModel.isDirty).toBe(true)

    const newUsers = ["Putin", "Madonna", "Tarzan", "Rocky"]
    mobx.runInAction(() => (viewModel.usersInterested = newUsers))
    expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,unobservedProp:testing,usersCount:3")
    expect(vr).toBe(
        "tea:true,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:testing testing,usersCount:4"
    )
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(true)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(true)
    expect(viewModel.isPropertyDirty("unobservedProp")).toBe(false)
    expect(viewModel.isPropertyDirty("usersCount")).toBe(false)
    expect(viewModel.changedValues.has("done")).toBe(true)

    mobx.runInAction(() => (viewModel.done = false))
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.changedValues.has("done")).toBe(false)

    mobx.runInAction(() => model.usersInterested.push("Cersei"))
    expect(tr).toBe(
        "tea:false,interested:Vader,Madonna,Tarzan,Cersei,unobservedProp:testing testing,usersCount:4"
    )
    expect(vr).toBe(
        "tea:false,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:testing testing,usersCount:4"
    ) // change NOT reflected in view model bcs users are dirty
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("unobservedProp")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(true)

    // should reset
    viewModel.reset()
    expect(tr).toBe(
        "tea:false,interested:Vader,Madonna,Tarzan,Cersei,unobservedProp:testing testing,usersCount:4"
    )
    expect(vr).toBe(
        "tea:false,interested:Vader,Madonna,Tarzan,Cersei,unobservedProp:testing testing,usersCount:4"
    )
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)
    expect(viewModel.isPropertyDirty("unobservedProp")).toBe(false)

    mobx.runInAction(() => (viewModel.title = "beer"))
    expect(tr).toBe(
        "tea:false,interested:Vader,Madonna,Tarzan,Cersei,unobservedProp:testing testing,usersCount:4"
    )
    expect(vr).toBe(
        "beer:false,interested:Vader,Madonna,Tarzan,Cersei,unobservedProp:testing testing,usersCount:4"
    )
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("title")).toBe(true)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)
    expect(viewModel.isPropertyDirty("unobservedProp")).toBe(false)

    mobx.runInAction(() => viewModel.resetProperty("title"))
    expect(tr).toBe(
        "tea:false,interested:Vader,Madonna,Tarzan,Cersei,unobservedProp:testing testing,usersCount:4"
    )
    expect(vr).toBe(
        "tea:false,interested:Vader,Madonna,Tarzan,Cersei,unobservedProp:testing testing,usersCount:4"
    )
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)
    expect(viewModel.isPropertyDirty("unobservedProp")).toBe(false)

    mobx.runInAction(() => {
        model.usersInterested.pop()
        model.usersInterested.pop()
    })
    expect(tr).toBe(
        "tea:false,interested:Vader,Madonna,unobservedProp:testing testing,usersCount:2"
    )
    expect(vr).toBe(
        "tea:false,interested:Vader,Madonna,unobservedProp:testing testing,usersCount:2"
    )
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)
    expect(viewModel.isPropertyDirty("unobservedProp")).toBe(false)

    mobx.runInAction(() => {
        viewModel.title = "cola"
        viewModel.usersInterested = newUsers
        viewModel.unobservedProp = "new value"
    })
    expect(tr).toBe(
        "tea:false,interested:Vader,Madonna,unobservedProp:testing testing,usersCount:2"
    )
    expect(vr).toBe(
        "cola:false,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:new value,usersCount:4"
    )
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(true)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(true)
    expect(viewModel.isPropertyDirty("unobservedProp")).toBe(true)

    // model changes should not update view model which is dirty
    mobx.runInAction(() => {
        model.title = "coffee"
        model.unobservedProp = "another new value"
    })
    expect(tr).toBe(
        "coffee:false,interested:Vader,Madonna,unobservedProp:another new value,usersCount:2"
    )
    expect(vr).toBe(
        "cola:false,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:new value,usersCount:4"
    )

    viewModel.submit()
    expect(tr).toBe(
        "cola:false,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:new value,usersCount:4"
    )
    expect(vr).toBe(
        "cola:false,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:new value,usersCount:4"
    )
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.isPropertyDirty("done")).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)
    expect(viewModel.isPropertyDirty("unobservedProp")).toBe(false)

    // computed setters shall transparently be called on the view model
    mobx.runInAction(() => {
        viewModel.prefixedTitle = "FooBarCoffee"
    })
    expect(tr).toBe(
        "cola:false,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:new value,usersCount:4"
    )
    expect(vr).toBe(
        "Coffee:false,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:new value,usersCount:4"
    )
    expect(viewModel.title).toBe("Coffee")
    expect(viewModel.prefixedTitle).toBe("StrongCoffee")
    expect(viewModel.isDirty).toBe(true)
    expect(viewModel.isPropertyDirty("title")).toBe(true)
    expect(viewModel.isPropertyDirty("prefixedTitle")).toBe(false)

    viewModel.submit()
    expect(tr).toBe(
        "Coffee:false,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:new value,usersCount:4"
    )
    expect(vr).toBe(
        "Coffee:false,interested:Putin,Madonna,Tarzan,Rocky,unobservedProp:new value,usersCount:4"
    )
    expect(model.prefixedTitle).toBe("StrongCoffee")
    expect(viewModel.isDirty).toBe(false)
    expect(viewModel.isPropertyDirty("title")).toBe(false)
    expect(viewModel.isPropertyDirty("prefixedTitle")).toBe(false)

    d1()
    d2()
}
