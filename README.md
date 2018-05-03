Evaluatex
=========

**Evaluatex** is a parser that reads and evaluates LaTeX and ASCII math. Use in Node, Angular, or with vanilla Javascript on both clients and servers.

**Evaluatex** can safely resolve math without relying Javascript's native `eval()` function. It can also support custom variables and functions, so you can pass in arbitrary values without having to hard-code the math.

> **Evaluatex** is in development. It is in a functional state, but may do weird and unexpected things such as eating your cat.

Installation
-----
```bash
npm install evaluatex
# or
yarn install/add evaluatex
```

```javascript
const evaluatex = require("evaluatex");
// or
import evaluatex from "evaluatex";
```

Building
--------
Get [yarn](https://yarnpkg.com/en/) and do `yarn install`.

`yarn build` transpiles ES6 sources to `dist/`.

`yarn test` runs tests in the `test/` directory.

API
---
```javascript
const fn = evaluatex(expression, constants = {}, options = {});
const result = fn(variables = {});
```

- `evaluatex()` compiles a text math expression into a function `fn`.
    - `expression` is an ASCII or LaTeX expression to be parsed and evaluated.
    - `constants` is a map of constant values - values that don't change if you invoke `fn` more than once.
    - `options` is a map of options for the compiler.
- `result` is the numerical result of the calculation.
    - `variables` is a map of variables that *can* change between invocations.

Features and usage
------------------
A complete manual is available on the [project page](https://arthanzel.github.io/evaluatex).