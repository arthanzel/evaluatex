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
Evaluatex compiles a string into a Javascript function that you can invoke anytime. It's like calling `eval()`, but without the [evil](http://linterrors.com/js/eval-is-evil).

```javascript
const fn = evaluatex("1 + 2 * 3 ^ 4")
fn()
// 163
```

A one-liner:

```javascript
const result = evaluatex("1 + 2 * 3 ^ 4")()
// result = 163
```

Evaluatex returns a function because you can then invoke it multiple times with different variables.

```javascript
fn2 = evaluatex("1 + magic")
fn2({ magic: 3 })
// 4
fn2({ magic: 99 })
// 100
```

### Evaluatex is a calculator

Evaluatex supports all of the features you should expect from a simple calculator, including order of operations. Exponents use the `^` operator.

```javascript
evaluatex("1 + 2 * 3 ^ 4")()
// 163
```

You can use named values in expressions that are visible to the expression only. This avoids the need for `eval`. See the *Constants and variables* section for more.

```javascript
evaluatex("1 + a / b", { a: 3, b: 4 })()
// 1.75
```

Implicit multiplication with brackets or variables is not a problem.

```javascript
evaluatex("4a(1 + b)", { a: 3, b: 4 })()
// 60
```

You have full access to Javascript's `Math` object, including all functions and constants.

```javascript
evaluatex("sin(0.5PI) + magic", { magic: 3 })()
// 4
```

You can omit brackets from simple functions, but be careful with implicit multiplication.
```javascript
evaluatex("sin 2PI")() // Interpreted as sin(2) * PI
// 2.8566
evaluatex("sin PI^2")() // Interpreted as sin(PI^2)
// -0.43
```

> There is no universally-accepted standard for treating coefficients inside paren-less functions. Whenever in doubt, use parentheses.

## Custom functions

You can even define custom functions.

```javascript
evaluatex("incr(4)", { incr: function(x) { return x + 1; } })()
// 5
```

Multi-argument functions work just as well, but you need to include parentheses.

```javascript
evaluatex("hypot(3, 4)")()
// 5
evaluatex("min(5, 4, 3, 2, 1)")()
// 1
```

There's even functions built right in to Evaluatex to help with logs, roots, and trig:

```javascript
evaluatex("logn(81, 3)")()
// 4
evaluatex("rootn(8, 3)")()
// 2
evaluatex("csc(0.25PI)")()
// 1.414
```

Absolute values work like a charm...

```javascript
evaluatex("|5 - 20|")()
// 15
```

...as do factorials, which round to the nearest integer before performing the calculation:

```javascript
evaluatex("3.6!")()
// 24
```

### Constants and variables

You can refer to symbols, such as `x`, in a math expression. These symbols can be **constant** or **variable**.

**Constants** are specified in the call to `evaluatex()` as the second parameter. Their values are compiled by Evaluatex into the resultant equation. Use constants if you know that they won't change between invocations.

```javascript
const fn = evaluatex("100 + x", { x: 5 });
fn();
// 105
```

**Variables** are specified in the output function. Their values can be changed between invocations. If you compile an expression with a variable, you *must* give a value for that variable, otherwise Evaluatex will complain.

```javascript
const fn = evaluatex("100 + x");
fn({ x: 5 }); // 105
fn({ x: 6 }); // 106
```

You can combine constants and variables. Do note that constants have priority over variables - if you define a constant, you can't change it without re-compiling the equation.

```javascript
const fn = evaluatex("x + y", { x: 100 });
fn({ y: 5 }); // 105
fn({ x: 0, y: 6 }); // 106
```

### Constants and variables: performance notes
Using a variable requires looking up the variable every time that it is used. This is a little slow. If a variable doesn't change, prefer constants.

If you use a constant and need to change it, you need to call `evaluatex()` again to re-compile the math expression. This is **really** slow. If there's a chance that a constant may change (e.g. user input), prefer variables.

LaTeX-specific behaviour
------------------------
Turn on LaTeX idiosyncrasies with `{ latex: true }` in the third parameter:

```javascript
evaluatex("x^24", { x: 2 }, { latex: true })()
// 16
```

The previous example is evaluated as x^(2) * 4, since LaTeX often takes only the first digit of a number for such operations. Use curly braces (`{` and `}`) to fix that:

```javascript
evaluatex("x^{24}", { x: 2 }, { latex: true })()
// 16777216
```

If you try to use parens or square brackets, Evaluatex will complain.

```javascript
evaluatex("x^(24)", { x: 2 }, { latex: true })
Error!
```

LaTeX thinks that the above expression means `x^'(' * 24)`, which is clearly bogus syntax. When in doubt, always use braces.

One more example:

```javascript
evaluatex("\\frac 123") // Interpreted as (1/2) * 3
1.5
```
