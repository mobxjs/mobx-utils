import { createTransformer } from "../"
import * as m from "mobx"
import * as tape from "tape"

function test(title: string, fn: tape.TestCase) {
    tape(title, t => {
        m.useStrict(false)
        try {
            fn(t)
        } finally {
            m.useStrict(true)
        }
    })
}

test("transform1", function(t) {
    let todoCalc = 0
    let stateCalc = 0
    let state = m.observable({
        todos: [
            {
                title: "coffee"
            }
        ],
        name: "michel"
    })

    let mapped
    let unloaded = []

    let transformState = createTransformer(function(state: any) {
        stateCalc++
        return state.name + state.todos.map(transformTodo).join(",")
    })

    let transformTodo = createTransformer(
        function(todo: any) {
            todoCalc++
            return todo.title.toUpperCase()
        },
        function cleanup(text, todo) {
            unloaded.push([todo, text])
        }
    )

    m.autorun(function() {
        mapped = transformState(state)
    })

    t.equal(mapped, "michelCOFFEE")
    t.equal(stateCalc, 1)
    t.equal(todoCalc, 1)

    state.name = "john"
    t.equal(mapped, "johnCOFFEE")
    t.equal(stateCalc, 2)
    t.equal(todoCalc, 1)

    state.todos[0].title = "TEA"
    t.equal(mapped, "johnTEA")
    t.equal(stateCalc, 3)
    t.equal(todoCalc, 2)

    state.todos.push({ title: "BISCUIT" })
    t.equal(mapped, "johnTEA,BISCUIT")
    t.equal(stateCalc, 4)
    t.equal(todoCalc, 3)

    let tea = state.todos.shift()
    t.equal(mapped, "johnBISCUIT")
    t.equal(stateCalc, 5)
    t.equal(todoCalc, 3)

    t.equal(unloaded.length, 1)
    t.equal(unloaded[0][0], tea)
    t.equal(unloaded[0][1], "TEA")
    t.equal((tea as any).$mobx.values.title.observers.length, 0)
    t.equal((state.todos[0] as any).$mobx.values.title.observers.length, 1)

    tea.title = "mint"
    t.equal(mapped, "johnBISCUIT")
    t.equal(stateCalc, 5)
    t.equal(todoCalc, 3)

    t.deepEqual(Object.keys(state.todos[0]), ["title"])
    t.end()
})

test("createTransformer as off-instance computed", t => {
    let runs = 0

    // observable in closure
    let capitalize = m.observable.box(false)

    let _computeDisplayName = person => {
        runs++ // count the runs
        let res = person.firstName + " " + person.lastName
        if (capitalize.get()) return res.toUpperCase()
        return res
    }

    // transformer creates a computed but reuses it for every time the same object is passed in
    let displayName = createTransformer(_computeDisplayName)

    let person1 = m.observable({
        firstName: "Mickey",
        lastName: "Mouse"
    })

    let person2 = m.observable({
        firstName: "Donald",
        lastName: "Duck"
    })

    let persons = m.observable([])
    let displayNames = []

    let disposer = m.autorun(() => {
        displayNames = persons.map(p => displayName(p))
    })

    t.equal(runs, 0)
    t.deepEqual(displayNames, [])

    persons.push(person1)
    t.equal(runs, 1)
    t.deepEqual(displayNames, ["Mickey Mouse"])

    t.equal(displayName(person1), "Mickey Mouse")
    t.equal(runs, 1)

    persons.push(person2)
    t.equal(runs, 2)
    t.deepEqual(displayNames, ["Mickey Mouse", "Donald Duck"])

    persons.push(person1)
    t.equal(runs, 2)
    t.deepEqual(displayNames, ["Mickey Mouse", "Donald Duck", "Mickey Mouse"])

    person1.firstName = "Minnie"
    t.equal(runs, 3)
    t.deepEqual(displayNames, ["Minnie Mouse", "Donald Duck", "Minnie Mouse"])

    capitalize.set(true)
    t.equal(runs, 5)
    t.deepEqual(displayNames, ["MINNIE MOUSE", "DONALD DUCK", "MINNIE MOUSE"])

    persons.splice(1, 1)
    t.deepEqual(displayNames, ["MINNIE MOUSE", "MINNIE MOUSE"])

    person2.firstName = "Dagobert"
    t.equal(runs, 5)

    disposer()
    person1.lastName = "Maxi"
    t.equal(runs, 5)

    t.equal(displayName(person1), "MINNIE MAXI")
    t.equal(runs, 6)
    t.end()
})

test("transform into reactive graph", function(t) {
    function Folder(name) {
        m.extendObservable(this, {
            name: name,
            children: []
        })
    }

    let _childrenRecalc = 0
    function DerivedFolder(state, baseFolder) {
        this.state = state
        this.baseFolder = baseFolder
        m.extendObservable(this, {
            get name() {
                return this.baseFolder.name
            },
            get isVisible() {
                return (
                    !this.state.filter ||
                    this.name.indexOf(this.state.filter) !== -1 ||
                    this.children.length > 0
                )
            },
            get children() {
                _childrenRecalc++
                return this.baseFolder.children.map(transformFolder).filter(function(folder) {
                    return folder.isVisible === true
                })
            }
        })
    }

    let state: any = m.observable({
        filter: null
    })

    let _transformCount = 0
    let transformFolder = createTransformer(function(folder) {
        _transformCount++
        // console.log("Transform", folder.name)
        return new DerivedFolder(state, folder)
    })

    state.root = new Folder("/")
    m.autorun(function() {
        state.derived = transformFolder(state.root)
        state.derived.children
    })

    /** test convience */
    function childrenRecalcs() {
        let a = _childrenRecalc
        _childrenRecalc = 0
        return a
    }

    function transformCount() {
        let a = _transformCount
        _transformCount = 0
        return a
    }

    t.equal(state.derived.name, "/")
    t.equal(state.derived.children.length, 0)
    t.equal(transformCount(), 1)
    t.equal(childrenRecalcs(), 1)

    state.root.children.push(new Folder("hoi"))
    t.equal(state.derived.name, "/")
    t.equal(state.derived.children.length, 1)
    t.equal(state.derived.children[0].name, "hoi")
    t.equal(transformCount(), 1)
    t.equal(childrenRecalcs(), 1)

    state.filter = "boe"
    t.equal(state.derived.name, "/")
    t.equal(state.derived.isVisible, false)
    t.equal(state.derived.children.length, 0)
    t.equal(transformCount(), 0)
    t.equal(childrenRecalcs(), 2)

    state.filter = "oi"
    t.equal(state.derived.name, "/")
    t.equal(state.derived.isVisible, true)
    t.equal(state.derived.children.length, 1)
    t.equal(state.derived.children[0].name, "hoi")
    t.equal(transformCount(), 0)
    t.equal(childrenRecalcs(), 1)
    t.end()
})

// testing: https://github.com/mobxjs/mobx/issues/67
test("transform tree (modifying tree incrementally)", function(t) {
    const testSet = createTestSet()
    let state = testSet.state
    let stats = testSet.stats
    let TreeNode = testSet.TreeNode
    let DisplayNode = testSet.DisplayNode

    let nodeCreateCount = 0
    let renderCount = 0
    let renderNodeCount = 0

    let transformNode = createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        // KM: ideally, I would like to do an assignment here, but it creates a cycle and would need to preserve ms.modifiers.structure:
        //
        // state.renderedNodes = state.root ? state.root.map(transformNode) : [];
        //

        let renderedNodes = state.root ? state.root.map(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    t.equal(nodeCreateCount, 0)
    t.equal(stats.refCount, 0)
    t.equal(renderCount, 1)
    t.equal(renderNodeCount, 0)
    t.deepEqual(state.renderedNodes.length, 0)

    ////////////////////////////////////
    // Incremental Tree
    ////////////////////////////////////

    // initialize root
    let node = new TreeNode("root")
    state.root = node
    t.equal(nodeCreateCount, 1)
    t.equal(stats.refCount, 1)
    t.equal(renderCount, 2)
    t.equal(renderNodeCount, 1)
    t.deepEqual(state.renderedNodes.length, 1)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), ["root"])

    // add first child
    state.root.addChild(new TreeNode("root-child-1"))
    t.equal(nodeCreateCount, 1 + 1)
    t.equal(stats.refCount, 1 + 1)
    t.equal(renderCount, 2 + 1)
    t.equal(renderNodeCount, 1 + 2)
    t.deepEqual(state.renderedNodes.length, 2)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), ["root", "root-child-1"])

    // add second child
    state.root.addChild(new TreeNode("root-child-2"))
    t.equal(nodeCreateCount, 1 + 1 + 1)
    t.equal(stats.refCount, 1 + 1 + 1)
    t.equal(renderCount, 2 + 1 + 1)
    t.equal(renderNodeCount, 1 + 2 + 3)
    t.deepEqual(state.renderedNodes.length, 3)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-2"
    ])

    // add first child to second child
    node = state.root.find(function(node) {
        return node.name === "root-child-2"
    })
    node.addChild(new TreeNode("root-child-2-child-1"))
    t.equal(nodeCreateCount, 1 + 1 + 1 + 1)
    t.equal(stats.refCount, 1 + 1 + 1 + 1)
    t.equal(renderCount, 2 + 1 + 1 + 1)
    t.equal(renderNodeCount, 1 + 2 + 3 + 4)
    t.deepEqual(state.renderedNodes.length, 4)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // add first child to first child
    node = state.root.find(function(node) {
        return node.name === "root-child-1"
    })
    node.addChild(new TreeNode("root-child-1-child-1"))
    t.equal(nodeCreateCount, 1 + 1 + 1 + 1 + 1)
    t.equal(stats.refCount, 1 + 1 + 1 + 1 + 1)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 1)
    t.equal(renderNodeCount, 1 + 2 + 3 + 4 + 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // remove children from first child
    node = state.root.find(function(node) {
        return node.name === "root-child-1"
    })
    node.children.splice(0)
    t.equal(nodeCreateCount, 1 + 1 + 1 + 1 + 1 + 0)
    t.equal(stats.refCount, 1 + 1 + 1 + 1 + 1 - 1)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 1 + 1)
    t.equal(renderNodeCount, 1 + 2 + 3 + 4 + 5 + 4)
    t.deepEqual(state.renderedNodes.length, 4)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // remove children from first child with no children should be a no-op
    node = state.root.find(function(node) {
        return node.name === "root-child-1"
    })
    node.children.splice(0)
    t.equal(nodeCreateCount, 1 + 1 + 1 + 1 + 1 + 0 + 0)
    t.equal(stats.refCount, 1 + 1 + 1 + 1 + 1 - 1 + 0)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 1 + 1 + 0)
    t.equal(renderNodeCount, 1 + 2 + 3 + 4 + 5 + 4 + 0)
    t.deepEqual(state.renderedNodes.length, 4)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // remove children from root
    state.root.children.splice(0)
    t.equal(nodeCreateCount, 1 + 1 + 1 + 1 + 1 + 0 + 0 + 0)
    t.equal(stats.refCount, 1 + 1 + 1 + 1 + 1 - 1 + 0 - 3)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 1 + 1 + 0 + 1)
    t.equal(renderNodeCount, 1 + 2 + 3 + 4 + 5 + 4 + 0 + 1)
    t.deepEqual(state.renderedNodes.length, 1)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), ["root"])

    // teardown
    state.root = null
    t.equal(nodeCreateCount, 1 + 1 + 1 + 1 + 1 + 0 + 0 + 0 + 0)
    t.equal(stats.refCount, 0)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 1 + 1 + 0 + 1 + 1)
    t.equal(renderNodeCount, 1 + 2 + 3 + 4 + 5 + 4 + 0 + 1 + 0)
    t.deepEqual(state.renderedNodes.length, 0)
    t.end()
})

test("transform tree (modifying tree incrementally)", function(t) {
    const testSet = createTestSet()
    let state = testSet.state
    let stats = testSet.stats
    let TreeNode = testSet.TreeNode
    let DisplayNode = testSet.DisplayNode

    let nodeCreateCount = 0
    let renderCount = 0
    let renderNodeCount = 0

    let transformNode = createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        let renderedNodes = state.root ? state.root.map(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // setup
    let node = new TreeNode("root-1")
    state.root = node
    t.equal(nodeCreateCount, 1)
    t.equal(stats.refCount, 1)
    t.equal(renderCount, 2)
    t.equal(renderNodeCount, 1)
    t.deepEqual(state.renderedNodes.length, 1)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), ["root-1"])

    ////////////////////////////////////
    // Batch Tree (Partial)
    ////////////////////////////////////

    // add partial tree as a batch
    let children = []
    children.push(new TreeNode("root-1-child-1b"))
    children[0].addChild(new TreeNode("root-1-child-1b-child-1"))
    children.push(new TreeNode("root-1-child-2b"))
    children[1].addChild(new TreeNode("root-1-child-2b-child-1"))
    state.root.addChildren(children)
    t.equal(nodeCreateCount, 1 + 4)
    t.equal(stats.refCount, 1 + 4)
    t.equal(renderCount, 2 + 1)
    t.equal(renderNodeCount, 1 + 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root-1",
        "root-1-child-1b",
        "root-1-child-1b-child-1",
        "root-1-child-2b",
        "root-1-child-2b-child-1"
    ])

    // remove root-1
    state.root = null
    t.equal(nodeCreateCount, 1 + 4 + 0)
    t.equal(stats.refCount, 1 + 4 - 5)
    t.equal(renderCount, 2 + 1 + 1)
    t.equal(renderNodeCount, 1 + 5 + 0)
    t.deepEqual(state.renderedNodes.length, 0)

    ////////////////////////////////////
    // Batch Tree (Full)
    ////////////////////////////////////

    // add full tree as a batch
    node = new TreeNode("root-2")
    node.addChild(new TreeNode("root-2-child-1"))
    node.children[0].addChild(new TreeNode("root-2-child-1-child-1"))
    node.addChild(new TreeNode("root-2-child-2"))
    node.children[1].addChild(new TreeNode("root-2-child-2-child-1"))
    state.root = node
    t.equal(nodeCreateCount, 1 + 4 + 0 + 5)
    t.equal(stats.refCount, 1 + 4 - 5 + 5)
    t.equal(renderCount, 2 + 1 + 1 + 1)
    t.equal(renderNodeCount, 1 + 5 + 0 + 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root-2",
        "root-2-child-1",
        "root-2-child-1-child-1",
        "root-2-child-2",
        "root-2-child-2-child-1"
    ])

    // teardown
    state.root = null
    t.equal(nodeCreateCount, 1 + 4 + 0 + 5 + 0)
    t.equal(stats.refCount, 0)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 1)
    t.equal(renderNodeCount, 1 + 5 + 0 + 5 + 0)
    t.deepEqual(state.renderedNodes.length, 0)
    t.end()
})

test("transform tree (modifying expanded)", function(t) {
    const testSet = createTestSet()
    let state = testSet.state
    let stats = testSet.stats
    let TreeNode = testSet.TreeNode
    let DisplayNode = testSet.DisplayNode

    let nodeCreateCount = 0
    let renderCount = 0
    let renderNodeCount = 0

    let transformNode = createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        let renderedNodes = state.root ? state.root.transform(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // patch for collapsed
    TreeNode.prototype.transform = function(iteratee, results) {
        if (this.parent && state.collapsed.has(this.parent.path())) return results || [] // not visible

        results = results || []
        results.push(iteratee(this))
        this.children.forEach(function(child) {
            child.transform(iteratee, results)
        })
        return results
    }

    // setup
    let node = new TreeNode("root")
    node.addChild(new TreeNode("root-child-1"))
    node.children[0].addChild(new TreeNode("root-child-1-child-1"))
    node.addChild(new TreeNode("root-child-2"))
    node.children[1].addChild(new TreeNode("root-child-2-child-1"))
    state.root = node
    t.equal(nodeCreateCount, 5)
    t.equal(stats.refCount, 5)
    t.equal(renderCount, 2)
    t.equal(renderNodeCount, 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Expanded
    ////////////////////////////////////

    // toggle root to collapsed
    state.renderedNodes[0].toggleCollapsed()
    t.equal(nodeCreateCount, 5 + 0)
    t.equal(stats.refCount, 5 - 4)
    t.equal(renderCount, 2 + 1)
    t.equal(renderNodeCount, 5 + 1)
    t.deepEqual(state.renderedNodes.length, 1)
    t.notDeepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity)) // not a direct map of the tree nodes
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), ["root"])

    // toggle root to expanded
    state.renderedNodes[0].toggleCollapsed()
    t.equal(nodeCreateCount, 5 + 0 + 4)
    t.equal(stats.refCount, 5 - 4 + 4)
    t.equal(renderCount, 2 + 1 + 1)
    t.equal(renderNodeCount, 5 + 1 + 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // toggle child-1 collapsed
    state.renderedNodes[1].toggleCollapsed()
    t.equal(nodeCreateCount, 5 + 0 + 4 + 0)
    t.equal(stats.refCount, 5 - 4 + 4 - 1)
    t.equal(renderCount, 2 + 1 + 1 + 1)
    t.equal(renderNodeCount, 5 + 1 + 5 + 4)
    t.deepEqual(state.renderedNodes.length, 4)
    t.notDeepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity)) // not a direct map of the tree nodes
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // toggle child-2-child-1 collapsed should be a no-op
    state.renderedNodes[state.renderedNodes.length - 1].toggleCollapsed()
    t.equal(nodeCreateCount, 5 + 0 + 4 + 0 + 0)
    t.equal(stats.refCount, 5 - 4 + 4 - 1 + 0)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 0)
    t.equal(renderNodeCount, 5 + 1 + 5 + 4 + 0)
    t.deepEqual(state.renderedNodes.length, 4)
    t.notDeepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity)) // not a direct map of the tree nodes
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // teardown
    state.root = null
    t.equal(nodeCreateCount, 5 + 0 + 4 + 0 + 0 + 0)
    t.equal(stats.refCount, 0)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 0 + 1)
    t.equal(renderNodeCount, 5 + 1 + 5 + 4 + 0 + 0)
    t.deepEqual(state.renderedNodes.length, 0)
    t.end()
})

test("transform tree (modifying render observable)", function(t) {
    const testSet = createTestSet()
    let state = testSet.state
    let stats = testSet.stats
    let TreeNode = testSet.TreeNode
    let DisplayNode = testSet.DisplayNode

    let nodeCreateCount = 0
    let renderCount = 0
    let renderNodeCount = 0
    let renderIconCalc = 0

    let transformNode = createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        let renderedNodes = state.root ? state.root.transform(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // custom transform
    TreeNode.prototype.transform = function(iteratee, results) {
        node.icon.get() // icon dependency

        results = results || []
        results.push(iteratee(this))
        this.children.forEach(function(child) {
            child.transform(iteratee, results)
        })
        return results
    }

    // setup
    let node = new TreeNode("root")
    node.addChild(new TreeNode("root-child-1"))
    node.children[0].addChild(new TreeNode("root-child-1-child-1"))
    node.addChild(new TreeNode("root-child-2"))
    node.children[1].addChild(new TreeNode("root-child-2-child-1"))
    state.root = node
    t.equal(nodeCreateCount, 5)
    t.equal(stats.refCount, 5)
    t.equal(renderCount, 2)
    t.equal(renderNodeCount, 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Icon
    ////////////////////////////////////

    // update root icon
    state.root.icon.set("file")
    t.equal(nodeCreateCount, 5 + 0)
    t.equal(stats.refCount, 5 + 0)
    t.equal(renderCount, 2 + 1)
    t.equal(renderNodeCount, 5 + 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // teardown
    state.root = null
    t.equal(nodeCreateCount, 5 + 0 + 0)
    t.equal(stats.refCount, 0)
    t.equal(renderCount, 2 + 1 + 1)
    t.equal(renderNodeCount, 5 + 5 + 0)
    t.deepEqual(state.renderedNodes.length, 0)
    t.end()
})

test("transform tree (modifying render-only observable)", function(t) {
    const testSet = createTestSet()
    let state = testSet.state
    let stats = testSet.stats
    let TreeNode = testSet.TreeNode
    let DisplayNode = testSet.DisplayNode

    let nodeCreateCount = 0
    let renderCount = 0
    let renderNodeCount = 0
    let renderIconCalc = 0

    let transformNode = createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        let renderedNodes = state.root ? state.root.map(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length

        state.renderedNodes.forEach(function(renderedNode) {
            m.autorun(function() {
                renderIconCalc++
                renderedNode.node.icon.get() // icon dependency
            })
        })
    })

    // setup
    let node = new TreeNode("root")
    node.addChild(new TreeNode("root-child-1"))
    node.children[0].addChild(new TreeNode("root-child-1-child-1"))
    node.addChild(new TreeNode("root-child-2"))
    node.children[1].addChild(new TreeNode("root-child-2-child-1"))
    state.root = node
    t.equal(nodeCreateCount, 5)
    t.equal(stats.refCount, 5)
    t.equal(renderCount, 2)
    t.equal(renderNodeCount, 5)
    t.equal(renderIconCalc, 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Icon
    ////////////////////////////////////

    // update root icon
    state.root.icon.set("file")
    t.equal(nodeCreateCount, 5 + 0)
    t.equal(stats.refCount, 5 + 0)
    t.equal(renderCount, 2 + 0)
    t.equal(renderNodeCount, 5 + 0)
    t.equal(renderIconCalc, 5 + 1)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // teardown
    state.root = null
    t.equal(nodeCreateCount, 5 + 0 + 0)
    t.equal(stats.refCount, 0)
    t.equal(renderCount, 2 + 0 + 1)
    t.equal(renderNodeCount, 5 + 0 + 0)
    t.equal(renderIconCalc, 5 + 1 + 0)
    t.deepEqual(state.renderedNodes.length, 0)
    t.end()
})

test("transform tree (static tags / global filter only)", function(t) {
    const testSet = createTestSet()
    let state = testSet.state
    let stats = testSet.stats
    let TreeNode = testSet.TreeNode
    let DisplayNode = testSet.DisplayNode

    let nodeCreateCount = 0
    let renderCount = 0
    let renderNodeCount = 0

    let transformNode = createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        let renderedNodes = state.root ? state.root.transform(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // no tags
    state.tags = m.observable.array([])

    // custom transform
    TreeNode.prototype.transform = function(iteratee, results) {
        results = results || []
        if (!state.tags.length || intersection(state.tags, this.tags).length)
            results.push(iteratee(this))
        this.children.forEach(function(child) {
            child.transform(iteratee, results)
        })
        return results
    }

    // setup
    let node = new TreeNode("root", { tags: [1] })
    node.addChild(new TreeNode("root-child-1", { tags: [2] }))
    node.children[0].addChild(new TreeNode("root-child-1-child-1", { tags: [3] }))
    node.addChild(new TreeNode("root-child-2", { tags: [2] }))
    node.children[1].addChild(new TreeNode("root-child-2-child-1", { tags: [3] }))
    state.root = node
    t.equal(nodeCreateCount, 5)
    t.equal(stats.refCount, 5)
    t.equal(renderCount, 2)
    t.equal(renderNodeCount, 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Tags
    ////////////////////////////////////

    // add search tag
    state.tags.push(2)
    t.equal(nodeCreateCount, 5 + 0)
    t.equal(stats.refCount, 5 - 3)
    t.equal(renderCount, 2 + 1)
    t.equal(renderNodeCount, 5 + 2)
    t.deepEqual(state.renderedNodes.length, 2)
    t.notDeepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), ["root-child-1", "root-child-2"])

    // add search tag
    state.tags.push(3)
    t.equal(nodeCreateCount, 5 + 0 + 2)
    t.equal(stats.refCount, 5 - 3 + 2)
    t.equal(renderCount, 2 + 1 + 1)
    t.equal(renderNodeCount, 5 + 2 + 4)
    t.deepEqual(state.renderedNodes.length, 4)
    t.notDeepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // add search tag
    state.tags.push(1)
    t.equal(nodeCreateCount, 5 + 0 + 2 + 1)
    t.equal(stats.refCount, 5 - 3 + 2 + 1)
    t.equal(renderCount, 2 + 1 + 1 + 1)
    t.equal(renderNodeCount, 5 + 2 + 4 + 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // remove search tags
    state.tags.splice(0, 2)
    t.equal(nodeCreateCount, 5 + 0 + 2 + 1 + 0)
    t.equal(stats.refCount, 5 - 3 + 2 + 1 - 4)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 1)
    t.equal(renderNodeCount, 5 + 2 + 4 + 5 + 1)
    t.deepEqual(state.renderedNodes.length, 1)
    t.notDeepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), ["root"])

    // teardown
    state.root = null
    t.equal(nodeCreateCount, 5 + 0 + 2 + 1 + 0 + 0)
    t.equal(stats.refCount, 0)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 1 + 1)
    t.equal(renderNodeCount, 5 + 2 + 4 + 5 + 1 + 0)
    t.deepEqual(state.renderedNodes.length, 0)
    t.end()
})

test("transform tree (dynamic tags - peek / rebuild)", function(t) {
    const testSet = createTestSet()
    let state = testSet.state
    let stats = testSet.stats
    let TreeNode = testSet.TreeNode
    let DisplayNode = testSet.DisplayNode

    let nodeCreateCount = 0
    let renderCount = 0
    let renderNodeCount = 0

    let transformNode = createTransformer(
        function(node) {
            nodeCreateCount++
            return new DisplayNode(node)
        },
        function cleanup(displayNode, node) {
            displayNode.destroy()
        }
    )

    // transform nodes to renderedNodes
    m.autorun(function() {
        let renderedNodes = state.root ? state.root.transform(transformNode) : []
        state.renderedNodes.replace(renderedNodes)
    })

    // render
    m.autorun(function() {
        renderCount++
        renderNodeCount += state.renderedNodes.length
    })

    // no tags
    state.tags = m.observable.array([])

    // custom transform
    TreeNode.prototype.transform = function(iteratee, results) {
        results = results || []
        if (!state.tags.length || intersection(state.tags, this.tags).length)
            results.push(iteratee(this))
        this.children.forEach(function(child) {
            child.transform(iteratee, results)
        })
        return results
    }

    // setup
    let node = new TreeNode("root", { tags: m.observable.array([1]) })
    node.addChild(new TreeNode("root-child-1", { tags: m.observable.array([2]) }))
    node.children[0].addChild(
        new TreeNode("root-child-1-child-1", { tags: m.observable.array([3]) })
    )
    node.addChild(new TreeNode("root-child-2", { tags: m.observable.array([2]) }))
    node.children[1].addChild(
        new TreeNode("root-child-2-child-1", { tags: m.observable.array([3]) })
    )
    state.root = node
    t.equal(nodeCreateCount, 5)
    t.equal(stats.refCount, 5)
    t.equal(renderCount, 2)
    t.equal(renderNodeCount, 5)
    t.deepEqual(state.renderedNodes.length, 5)
    t.deepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    ////////////////////////////////////
    // Tags
    ////////////////////////////////////

    // add search tag
    state.tags.push(2)
    t.equal(nodeCreateCount, 5 + 0)
    t.equal(stats.refCount, 5 - 3)
    t.equal(renderCount, 2 + 1)
    t.equal(renderNodeCount, 5 + 2)
    t.deepEqual(state.renderedNodes.length, 2)
    t.notDeepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), ["root-child-1", "root-child-2"])

    // modify search tag
    state.root.tags.push(2)
    t.equal(nodeCreateCount, 5 + 0 + 1)
    t.equal(stats.refCount, 5 - 3 + 1)
    t.equal(renderCount, 2 + 1 + 1)
    t.equal(renderNodeCount, 5 + 2 + 3)
    t.deepEqual(state.renderedNodes.length, 3)
    t.notDeepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1",
        "root-child-2"
    ])

    // perform multiple search tag operations
    m.transaction(function() {
        state.root.tags.shift() // no-op
        state.root
            .find(function(node) {
                return node.name === "root-child-1"
            })
            .tags.splice(0)
        state.root
            .find(function(node) {
                return node.name === "root-child-1-child-1"
            })
            .tags.push(2)
        state.root
            .find(function(node) {
                return node.name === "root-child-2-child-1"
            })
            .tags.push(2)
    })
    t.equal(nodeCreateCount, 5 + 0 + 1 + 2)
    t.equal(stats.refCount, 5 - 3 + 1 + 1)
    t.equal(renderCount, 2 + 1 + 1 + 1)
    t.equal(renderNodeCount, 5 + 2 + 3 + 4)
    t.deepEqual(state.renderedNodes.length, 4)
    t.notDeepEqual(state.renderedNodes.map(pluckFn("node")), state.root.map(identity))
    t.deepEqual(state.renderedNodes.map(pluckFn("node.name")), [
        "root",
        "root-child-1-child-1",
        "root-child-2",
        "root-child-2-child-1"
    ])

    // teardown
    state.root = null
    t.equal(nodeCreateCount, 5 + 0 + 1 + 2 + 0)
    t.equal(stats.refCount, 0)
    t.equal(renderCount, 2 + 1 + 1 + 1 + 1)
    t.equal(renderNodeCount, 5 + 2 + 3 + 4 + 0)
    t.deepEqual(state.renderedNodes.length, 0)
    t.end()
})

// https://github.com/mobxjs/mobx/issues/886
test("transform with primitive key", function(t) {
    function Bob() {
        this.num = Math.floor(Math.random() * 1000)
        m.extendObservable(this, {
            get name() {
                return "Bob" + this.num
            }
        })
    }

    let observableBobs = m.observable([])
    let bobs = []

    let bobFactory = createTransformer(function(key) {
        return new Bob()
    })

    m.autorun(function() {
        bobs = observableBobs.map(function(bob) {
            return bobFactory(bob)
        })
    })

    observableBobs.push("Bob1")
    observableBobs.push("Bob1")
    t.equal(bobs[0].name, bobs[1].name)

    observableBobs.clear()
    observableBobs.push("Bob1")
    observableBobs.push("Bob2")
    t.notEquivalent(bobs[0].name, bobs[1].name)

    observableBobs.clear()
    observableBobs.push(1)
    observableBobs.push(1)
    t.equal(bobs[0].name, bobs[1].name)

    observableBobs.clear()
    observableBobs.push(1)
    observableBobs.push(2)
    t.notEquivalent(bobs[0].name, bobs[1].name)
    t.end()
})

const intersection = require("lodash.intersection")

function pluckFn(key) {
    return function(obj) {
        let keys = key.split("."),
            value = obj
        for (let i = 0, l = keys.length; i < l; i++) {
            if (!value) return
            value = value[keys[i]]
        }
        return value
    }
}

function identity(value) {
    return value
}

function createTestSet(): any {
    let testSet: any = {}

    let state = (testSet.state = m.observable({
        root: null,
        renderedNodes: m.observable.array(),
        collapsed: m.observable.map() // KM: ideally, I would like to use a set
    }))

    let stats = (testSet.stats = {
        refCount: 0
    })

    let TreeNode = (testSet.TreeNode = function(name, extensions) {
        this.children = m.observable.array()
        this.icon = m.observable.box("folder")

        this.parent = null // not observed
        this.name = name // not observed

        // optional extensions
        if (extensions) {
            for (let key in extensions) {
                this[key] = extensions[key]
            }
        }
    })
    TreeNode.prototype.addChild = function(node) {
        node.parent = this
        this.children.push(node)
    }
    TreeNode.prototype.addChildren = function(nodes) {
        let _this = this
        nodes.map(function(node) {
            node.parent = _this
        })
        this.children.splice.apply(this.children, [this.children.length, 0].concat(nodes))
    }

    TreeNode.prototype.path = function() {
        let node = this,
            parts = []
        while (node) {
            parts.push(node.name)
            node = node.parent
        }
        return parts.join("/")
    }

    TreeNode.prototype.map = function(iteratee, results) {
        results = results || []
        results.push(iteratee(this))
        this.children.forEach(function(child) {
            child.map(iteratee, results)
        })
        return results
    }

    TreeNode.prototype.find = function(predicate) {
        if (predicate(this)) return this

        let result
        for (let i = 0, l = this.children.length; i < l; i++) {
            result = this.children[i].find(predicate)
            if (result) return result
        }
        return null
    }

    let DisplayNode = (testSet.DisplayNode = function(node) {
        stats.refCount++
        this.node = node
    })
    DisplayNode.prototype.destroy = function() {
        stats.refCount--
    }

    DisplayNode.prototype.toggleCollapsed = function() {
        let path = this.node.path()
        state.collapsed.has(path) ? state.collapsed.delete(path) : state.collapsed.set(path, true) // KM: ideally, I would like to use a set
    }

    return testSet
}
