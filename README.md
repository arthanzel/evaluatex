Evaluatex
=========
**Evaluatex** is a parser that reads and evaluates LaTeX and ASCII math. Use in Node, Angular, or with vanilla Javascript on both clients and servers.

**Evaluatex** can safely resolve math without relying Javascript's native `eval()` function. It can also support custom variables and functions, so you can pass in arbitrary values without having to hard-code the math.

> **Evaluatex** is in development. It is in a functional state, but may do weird and unexpected things such as eating your cat.

Installation
-----
```bash
$ npm install evaluatex # (coming soon!)
$ bower install evaluatex # (coming soon!)
```

```javascript
// Node.js
var Evaluatex  = require("evaluatex");

// Angular V1
angular.module("myModule", ["evaluatex"])
.service("MyService", function(Evaluatex) {});
```

```html
<!-- Vanilla JS -->
<script src="evaluatex.js"></script>
<script type="text/javascript">
	console.log(Evaluatex);
</script>
```

Building
--------
`npm` test will run a set of unit tests defined in `./test/evaluatex.spec.js`. These tests run in Node, and not in any browser runtime.

`npm run compile` will build the full script to `./evalulatex.js`. You can include this in your HTML files.

Usage
-----
```javascript
> Evaluatex.evaluate("1 + 2 * 3 ^ 4")
163
> Evaluatex.evaluate("sin(0.5PI) + magic", { magic: 3 })
4
```

Features
--------
By default, Evaluatex acts in ASCII mode. To use LaTeX-specific behaviour, pass in `{ latex: true }` as the **third** argument to `Evaluatex.evaluate`. Read on to learn more.

Evaluatex supports all of the features you should expect from a simple calculator, including order of operations. Exponents use the `^` operator.

```javascript
> Evaluatex.evaluate("1 + 2 * 3 ^ 4")
163
```

You can use variables in expressions that are visible to the expression only:

```javascript
> Evaluatex.evaluate("1 + a / b", { a: 3, b: 4 })
1.75
```

Implicit multiplication with parens or variables is not a problem.

```javascript
> Evaluatex.evaluate("4a(1+b)", { a: 3, b: 4 })
60
```

You have full access to Javascript's `Math` object, including all functions and constants.

```javascript
> Evaluatex.evaluate("sin(0.5PI) + magic", { magic: 3 })
4
```

You can omit parens from simple functions, but be careful with implicit multiplication.
```javascript
> Evaluatex.evaluate("sin 2PI") // Interpreted as sin(2) * PI
2.8566
> Evaluatex.evaluate("sin PI^2") // Interpreted as sin(PI^2)
-0.43
```

> There is no globally-accepted standard for treating coefficients inside paren-less functions. Whenever in doubt, use parentheses.

You can even define custom functions.

```javascript
> Evaluatex.evaluate("incr(4)", { incr: function(x) { return x + 1; } })
5
```

Multi-argument functions work just as well, but you need to include parentheses.

```javascript
> Evaluatex.evaluate("hypot(3, 4)")
5
> Evaluatex.evaluate("min(5,4,3,2,1)")
1
```

There's even functions built right in to Evaluatex to help with logs, roots, and trig:

```javascript
> Evaluatex.evaluate("logn(81, 3)")
4
> Evaluatex.evaluate("rootn(8, 3)")
2
> Evaluatex.evaluate("csc(0.25PI)")
1.414
```

Absolute values work like a charm...

```javascript
> Evaluatex.evaluate("|5 - 20|")
15
```

...as do factorials, which round to the nearest integer before performing the calculation:

```javascript
> Evaluatex.evaluate("3.6!")
24
```

LaTeX-specific behaviour
------------------------
Turn on LaTeX idiosyncrasies with `{ latex: true }` in the third parameter:

```javascript
> Evaluatex.evaluate("x^24", { x: 2 }, { latex: true })
16
```

The previous example is evaluated as x^(2) * 4, since LaTeX often takes only the first digit of a number for such operations. Use curly braces (`{` and `}`) to fix that:

```javascript
> Evaluatex.evaluate("x^{24}", { x: 2 }, { latex: true })
16777216
```

If you try to use parens or square brackets, Evaluatex will complain.

```javascript
> Evaluatex.evaluate("x^(24)", { x: 2 }, { latex: true })
Error!
```

LaTeX thinks that the above expression means `X^'(' * 24), which is clearly bogus syntax. When in doubt, always use braces.

One more example:

```javascript
> Evaluatex.evaluate("\\frac 123") // Interpreted as (1/2) * 3
1.5
```
