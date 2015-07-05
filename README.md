Evaluatex
=========
**Evaluatex** is a parser that reads and evaluates LaTeX math. It also comes with a handy little program called **Evaluascii**, which evaluates ASCIIMath. Use in Node, Angular, or with vanilla Javascript on both clients and servers.

**Evaluatex**/**Evaluascii** can safely resolve math without relying Javascript's native `eval()` function. They also support custom variables and functions, so you can pass in arbitrary values without having to hard-code the math.

> **Evaluatex** is in development, but **Evaluascii** is in a very usable and full-featured state.

Installation
-----
```bash
$ npm install evaluatex # (coming soon!)
$ bower install evaluatex # (coming soon!)
```

```javascript
// Node.js
var Evaluatex  = require("evaluatex");
var Evaluascii = require("evaluatex/evaluascii");

// Angular V1
angular.module("myModule", ["evaluatex", "evaluascii"])
.service("MyService", function(Evaluatex, Evaluascii) {});
```

```html
// Vanilla JS
<script src="evaluatex.js"></script>
<script type="text/javascript">
	console.log(Evaluatex);
</script>
```

Usage
-----
```javascript
> Evaluascii.evaluate("1 + 2 * 3 ^ 4")
163
> Evaluascii.evaluate("sin(0.5PI) + magic", { magic: 3 })
4
```

Evaluascii: Features
--------------------
Evaluascii supports all of the features you should expect from a simple calculator, including order of operations. Exponents use the `^` operator.

```javascript
> Evaluascii.evaluate("1 + 2 * 3 ^ 4")
163
```

You can use variables in expressions that are visible to the expression only:

```javascript
> Evaluascii.evaluate("1 + a / b", { a: 3, b: 4 })
1.75
```

Implicit multiplication with parens or variables is not a problem.

```javascript
> Evaluascii.evaluate("4a(1+b)", { a: 3, b: 4 })
60
```

You have full access to Javascript's `Math` object, including all functions and constants.

```javascript
> Evaluascii.evaluate("sin(0.5PI) + magic", { magic: 3 })
4
```

You can omit parens from simple functions, but be careful with implicit multiplication.
```javascript
> Evaluascii.evaluate("sin 2PI") // Interpreted as sin(2) * PI
2.8566
```

This will hopefully be improved at some point.

You can even define custom functions. More support for this is coming soon.

```javascript
> Evaluascii.evaluate("incr(4)", { incr: function(x) { return x + 1; } })
5
```

Multi-argument functions work just as well.

```javascript
> Evaluascii.evaluate("hypot(3, 4)")
5
> Evaluascii.evaluate("min(5,4,3,2,1)")
1
```

There's even a function built right in to Evaluascii to help with logs:

```javascript
> Evaluascii.evaluate("logn(9, 3)")
27
```

Absolute values work like a charm...

```javascript
> Evaluascii.evaluate("|5 - 20|")
15
```
...as do factorials, which round to the nearest integer before performing the calculation:

```javascript
> Evaluascii.evaluate("3.5!")
24
```
