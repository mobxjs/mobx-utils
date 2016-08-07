# MobX-utils

Work in progress

[![Build Status](https://travis-ci.org/mobxjs/mobx-utils.svg?branch=master)](https://travis-ci.org/mobxjs/mobx-utils)
[![Coverage Status](https://coveralls.io/repos/github/mobxjs/mobx-utils/badge.svg?branch=master)](https://coveralls.io/github/mobxjs/mobx-utils?branch=master)
[![Join the chat at https://gitter.im/mobxjs/mobx](https://badges.gitter.im/mobxjs/mobx.svg)](https://gitter.im/mobxjs/mobx?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Installation

`npm install mobx-utils --save`

# API

## keepAlive

[lib/keep-alive.js:20-25](https://github.com/mobxjs/mobx-utils/blob/d39fe6ac3587e1a9a6ab36d3850089bd6f880692/lib/keep-alive.js#L20-L25 "Source code on GitHub")

MobX normally suspends any computed value that is not in use by any reaction,
and lazily re-evaluates the expression if needed outside a reaction while not in use.
`keepAlive` marks a computed value as always in use, meaning that it will always fresh, but never disposed.

**Parameters**

-   `computedValue` **IComputedValue&lt;any>** created using the `computed` function
-   `_1`  
-   `_2`  

Returns **IDisposer** stops this keep alive so that the computed value goes back to normal behavior

## keepAlive

[lib/keep-alive.js:20-25](https://github.com/mobxjs/mobx-utils/blob/d39fe6ac3587e1a9a6ab36d3850089bd6f880692/lib/keep-alive.js#L20-L25 "Source code on GitHub")

MobX normally suspends any computed value that is not in use by any reaction,
and lazily re-evaluates the expression if needed outside a reaction while not in use.
`keepAlive` marks a computed value as always in use, meaning that it will always fresh, but never disposed.

**Parameters**

-   `target` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** an object that has a computed property, created by `@computed` or `extendObservable`
-   `property` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the property to keep alive
-   `_1`  
-   `_2`  

Returns **IDisposer** stops this keep alive so that the computed value goes back to normal behavior
