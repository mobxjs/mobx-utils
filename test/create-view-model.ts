import { createViewModel } from '../src/create-view-model';
import { extendObservable, autorun, runInAction } from "mobx";

test("create view model TS", () => {
   function Todo(title: string, done: boolean, usersInterested: Array<string>) {
      extendObservable(this, {
         title: title,
         done: done,
         usersInterested: usersInterested,
         get usersCount() {
            return this.usersInterested.length
         }
      })
   }

   const model = new Todo("coffee", false, ["Vader", "Madonna"])
   const viewModel = createViewModel(model)

   let tr: string;
   let vr: string;
   // original rendering
   const d1 = autorun(() => {
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
   const d2 = autorun(() => {
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

   runInAction(() => (model.title = "tea"))
   expect(tr).toBe("tea:false,interested:Vader,Madonna,usersCount:2")
   expect(vr).toBe("tea:false,interested:Vader,Madonna,usersCount:2") // change reflected in view model
   expect(viewModel.isDirty).toBe(false)

   runInAction(() => model.usersInterested.push("Tarzan"))
   expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,usersCount:3")
   expect(vr).toBe("tea:false,interested:Vader,Madonna,Tarzan,usersCount:3") // change reflected in view model
   expect(viewModel.isDirty).toBe(false)
   expect(viewModel.changedValues.size).toBe(0)

   runInAction(() => (viewModel.done = true))
   expect(tr).toBe("tea:false,interested:Vader,Madonna,Tarzan,usersCount:3")
   expect(vr).toBe("tea:true,interested:Vader,Madonna,Tarzan,usersCount:3")
   expect(viewModel.isDirty).toBe(true)
   expect(viewModel.isPropertyDirty("title")).toBe(false)
   expect(viewModel.isPropertyDirty("done")).toBe(true)
   expect(viewModel.isPropertyDirty("usersInterested")).toBe(false)
   expect(viewModel.isPropertyDirty("usersCount")).toBe(false)
   expect(viewModel.changedValues.has("done")).toBe(true))
