(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var Lexer = require("./Lexer");
var Parser = require("./Parser");
var localFunctions = require("./utils/localFunctions");

var Evaluatex = {};
// This is the main function in the API.
// It takes a math expression and a list of variables to which the expression refers.
// This function automatically creates and invokes the lexer, parser, and evaluator.
Evaluatex.evaluate = function(expression, locals, opts) {
    locals = locals || {};
    opts = opts || {};

    // Copy the local convenience functions into the `locals` object.
    for (i in localFunctions) {
        locals[i] = localFunctions[i];
    }

    // Copy functions and constants from Math into the `locals` object.
    // These will mask defined locals.
    var mathKeys = Object.getOwnPropertyNames(Math);
    for (i in mathKeys) {
        var key = mathKeys[i];
        locals[key] = Math[key];
    }

    var l = new Lexer(expression, opts);
    var p = new Parser(l.tokens, locals);
    var tree = p.parse();

    // Debugging aid - prints the AST after every test.
    // Use `npm run test-tree` to set the PRINT_TREE flag.
    // if (process.env.PRINT_TREE) {
    //     tree.printTree();
    // }
    
    return tree.evaluate(locals || {});
};

// Export stuff.
if (module) {
    module.exports = Evaluatex;
}
var angular = global.angular || false;
if (angular) {
    angular.module("evaluatex", []).value("Evaluatex", Evaluatex);
}
else {
    global.Evaluatex = Evaluatex;
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Lexer":2,"./Parser":4,"./utils/localFunctions":9}],2:[function(require,module,exports){
var arity = require("./utils/arity");
var interpolate = require("./utils/interpolate");
var tokens = require("./utils/tokens");
var Token = require("./Token");

var ALT_TOKENS = ["TPOWER", "TCOMMAND"];

// The lexer reads a math expression and breaks it down into easily-digestible "tokens".
// A string of tokens, such as `NUMBER(4) PLUS NUMBER(2)` can be more easily understood by machines than raw math.
var Lexer = module.exports = function(buffer, opts) {
    this.buffer = buffer;
    this.cursor = 0;
    this.opts = opts || {};
    this.tokens = [];

    // Lex
    this.lexExpression();
};

// Returns true if there are more tokens to be read from the buffer.
Lexer.prototype.hasNext = function() {
    return this.cursor < this.buffer.length;
};

// Gets the next token in the stream.
Lexer.prototype.next = function(len) {
    if (!this.hasNext()) {
        throw "Lexer error: reached end of stream.";
    }

    // Try matching each token in `this.tokenMap`.
    for (k in tokens) {
        var match = tokens[k].exec(this.buffer.substr(this.cursor, len));

        // A matching token *must* begin immediately at the cursor, otherwise
        // it probably appears later in the buffer.
        if (match && match.index == 0) {
            this.cursor += match[0].length;
            return new Token(k, match[0]);
        }
    }

    throw interpolate("Lexer error: Can't match token at position %: %.",
                      this.cursor,
                      this.buffer.substr(this.cursor, Math.min(len, 10)));
};

// Returns a token corresponding to the next single *letter* in the buffer,
// unless the following token is a LaTeX command, in which case the entire command
// token is returned. This makes it possible to lex LaTeX's stupidities like a^bc
// evaluating to a^{b}c
Lexer.prototype.nextSingle = function() {
    if (this.buffer.charAt(this.cursor) == "\\") {
        return this.next();
    }
    
    return this.next(1);
};

// Returns a list of all tokens for this lexer.
Lexer.prototype.lexExpression = function() {
    while (this.hasNext()) {
        var token = this.next();
        this.tokens.push(token);

        if (token.value == "{") {
            this.lexExpression();
        }
        else if (token.value == "}") {
            return;
        }

        // If the current token is one of those that accepts a single-char argument in LaTeX, deal with that accordingly, taking into account arity and left curly braces that change the formatting.
        else if (this.opts.latex && ALT_TOKENS.indexOf(token.type) != -1) {
            var nArgs = 1;

            if (token.type == "TCOMMAND") {
                nArgs = arity[token.value.substring(1).toLowerCase()] || 1;
            }

            // Lex arguments of the token
            for (var i = 0; i < nArgs; i++) {
                this.skipWhitespace();
                var next = this.nextSingle();
                if (next.value == "{") {
                    this.tokens.push(next);
                    this.lexExpression();
                }
                else {
                    // Surround single-letter arguments with parens to make them more explicit to the parser.
                    this.tokens.push(new Token("TLPAREN", "{"));
                    this.tokens.push(next);
                    this.tokens.push(new Token("TRPAREN", "}"));
                }
            }
        }
    }
};

Lexer.prototype.toString = function() {
    var tokenStrings = [];
    for (i in this.tokens) {
        tokenStrings.push(this.tokens[i].toString());
    }
    return tokenStrings.join(" ");
};

Lexer.prototype.skipWhitespace = function() {
    while (tokens["TWS"].test(this.buffer.charAt(this.cursor))) {
        this.cursor++;
    }
};
},{"./Token":5,"./utils/arity":6,"./utils/interpolate":7,"./utils/tokens":11}],3:[function(require,module,exports){
var interpolate = require("./utils/interpolate");
var isNumber = require("./utils/isNumber");

// Nodes that are allowed to have only one child. Nodes that have one child and are not in this list will be simplified during parsing.
var UNARY_NODES = ["FACTORIAL", "FUNCTION", "INVERSE", "NEGATE"];

// Represents a node in an abstract syntax tree. Nodes have a type (such as NUMBER), a value (such as the actual number value), and a list of child nodes.
var Node = module.exports = function Node(type, value) {
    if (value === undefined) value = "";

    this.type = type;
    this.value = value;
    this.children = [];
};

// Adds a child node.
Node.prototype.add = function(node) {
    this.children.push(node); return this;
};

// Calculates the numerical representation of this node, evaluating any child nodes as well.
Node.prototype.evaluate = function(locals) {
    switch (this.type) {
        case "FACTORIAL":
            result = 1;
            var i = Math.round(this.children[0].evaluate(locals));

            // Factorials for numbers < 0 are not defined.
            if (i < 0) {
                throw "Can't take the factorial of a negative number!";
            }

            // Compute the factorial.
            for (i; i > 0; i--) {
                result *= i;
            }
            return result;
        case "FUNCTION":
            var evaluatedChildren = [];
            for (i in this.children) {
                evaluatedChildren.push(this.children[i].evaluate(locals));
            }
            return this.value.apply(this, evaluatedChildren);
        case "INVERSE":
            return 1.0 / this.children[0].evaluate(locals);
        case "NEGATE":
            return -this.children[0].evaluate(locals);
        case "NUMBER":
            return this.value;
        case "POWER":
            return Math.pow(
                this.children[0].evaluate(locals),
                this.children[1].evaluate(locals)
            );
        case "PRODUCT":
            var result = 1;
            for (i in this.children) {
                result *= this.children[i].evaluate(locals);
            }
            return result;
        case "SUM":
            var result = 0;
            for (i in this.children) {
                result += this.children[i].evaluate(locals);
            }
            return result;
        case "SYMBOL":
            if (isNumber(locals[this.value])) {
                return locals[this.value];
            }
            throw "Symbol " + this.value +
                  " is undefined or not a number";
    }
};

Node.prototype.isUnary = function isUnary() {
    return UNARY_NODES.indexOf(this.type) >= 0;
};

// Prints a tree-like representation of this Node and its children to the console.
// Useful for debugging parser problems.
// If `printTree` is called on the root node, it prints the whole AST!
Node.prototype.printTree = function(level) {
    level = level || 0;

    // Generate the indent string from the current `level`.
    // Child nodes will have a greater `level` and will appear indented.
    var indent = "";
    var iString = "  ";
    for (var i = 0; i < level; i++) {
        indent += iString;
    };

    // Format: `TYPE value (children)`
    // OR
    // `TYPE (children)`.
    if (this.value) {
        console.log(interpolate("%% % (%)",
            indent,
            this.type,
            this.value.name || this.value,
            this.children.length));
    }
    else {
        console.log(interpolate("%% (%)",
            indent,
            this.type,
            this.children.length));
    }

    // Print each child.
    for (var i in this.children) {
        this.children[i].printTree(level + 1);
    }
};

// Simplifies this Node and all children recursively, returning a new
// node tree.
Node.prototype.simplify = function() {
    if (this.children.length > 1 || this.isUnary()) {
        var newNode = new Node(this.type, this.value);
        for (i in this.children) {
            newNode.add(this.children[i].simplify());
        }
        return newNode;
    }
    else if (this.children.length == 1) {
        return this.children[0].simplify();
    }
    else { // No children
        return this;
    }
};

},{"./utils/interpolate":7,"./utils/isNumber":8}],4:[function(require,module,exports){
var Node = require("./Node");
var Token = require("./Token");
var arity = require("./utils/arity");
var replacementTable = require("./utils/replacementTable");

// Parser
// ======

// The parser takes a list of Token objects and tries to construct a syntax
// tree that represents the math to be evaluated, taking into account the
// correct order of operations.
// This is a simple recursive-descent parser based on [Wikipedia's example](https://en.wikipedia.org/wiki/Recursive_descent_parser).
var Parser = module.exports = function(tokens, locals) {
    this.locals = locals || {};
    this.tokens = [];
    this.cursor = 0;

    // Strip whitespace from token list.
    for (i in tokens) {
        if (tokens[i].type != "TWS") {
            this.tokens.push(tokens[i]);
        }
    }
    this.preprocess(locals);
};

// This function applies some useful transformations to the token stream before it is parsed. This alleviates some work from the parser and keeps the parser and node code clean.
Parser.prototype.preprocess = function(locals) {
    for (i in this.tokens) {
        var previous = this.tokens[i - 1] || null;
        var current = this.tokens[i];
        var next = this.tokens[i + 1] || null;

        // First step is to perform 1:1 replacements with tokens in the replacement table.
        var key = current.type + ":" + current.value;
        if (replacementTable[key]) {
            this.tokens[i] = replacementTable[key];
            continue;
        }

        // Replace symbol tokens with function tokens if the symbol exists in the Math API or in the locals.
        if (current.type == "TSYMBOL") {
            if (typeof locals[current.value] == "function") {
                this.tokens[i] = new Token("TFUNCTION", locals[current.value]);
            }
            continue;
        }

        // Remove the slash in command tokens and convert to lower case.
        if (current.type == "TCOMMAND") {
            var fnName = current.value.substring(1).toLowerCase();
            current.value = locals[fnName];
            continue;
        }
    }
};

// The primary entry point of the parser - calling `parse()` will return a
// full AST that represents the provided tokens.
Parser.prototype.parse = function() {
    var tree = this.orderExpression().simplify();

    // Throw an exception if the expression looks fully parsed but still
    // contains tokens.
    if (this.current() != undefined) {
        throw "Expected end of input, but got " + this.current().type +
        " " + this.current().value;
    }

    return tree;
};

// Returns true if the token under the cursor matches the given type.
// If it does, increments the cursor to the next token.
// If it doesn't, the cursor stays where it is.
Parser.prototype.accept = function(token) {
    if (!this.current()) return false;

    if (this.current().type == token) {
        this.cursor++;
        return true;
    }
    return false;
};

// Expects the next token under the cursor to match the given type.
// If it does, increments the cursor to the next token.
// If it doesn't, throws an exception.
Parser.prototype.expect = function(token) {
    if (!this.accept(token)) {
        throw "Expected " + token + " but got " +
            (this.current() ? this.current().value : "end of input.");
    }
};

// Returns the current token under the cursor.
// This is the token that `accept()` will try to match.
Parser.prototype.current = function() {
    return this.tokens[this.cursor];
};

// Returns the previously-matched token.
// Useful when you `accept()` a token and need to get its value later.
Parser.prototype.prev = function() {
    return this.tokens[this.cursor - 1];
};

// Non-terminal rules
// ------------------

// The following parser functions match certain motifs that are called
// "non-terminals" in parsing lingo.
// Essentially, they implement a sort of finite state automaton.
// You should read the [Wikipedia article](https://en.wikipedia.org/wiki/Recursive_descent_parser) on recursive-descent parsing if you want to know more about how these work.

// ### Grammar:
// ```
// orderExpression : sum
// sum : product { ('+'|'-') product }
// product : power { ('*'|'/') power }
//         | power '(' orderExpression ')'
// val : SYMBOL
//     | NUMBER
//     | COMMAND { val }
//     | FUNCTION '(' orderExpression { ',' orderExpression } ')'
//     | '-' val
//     | '(' orderExpression ')'
//     | '{' orderExpression '}'
//     | '|' orderExpression '|'
//     | val '!'
// ```
Parser.prototype.orderExpression = function() {
    return this.sum();
};

// Parses sums or differences.
Parser.prototype.sum = function() {
    var node = new Node("SUM");
    node.add(this.product());
    
    // The `while` loop allows expressions like `a + b - c` to be treated
    // like `(a + b) - c`.
    while (true) {
        if (this.accept("TPLUS")) {
            node.add(this.product());
        }
        else if (this.accept("TMINUS")) {
            // To avoid implementing a special rule for differences, every
            // term to be subtracted is simply wrapped in a node that takes
            // the negative of its value when evaluated.
            node.add(new Node("NEGATE").add(this.product()));
        }
        else {
            break;
        }
    }

    return node;
};

// Parses products and quotients.
Parser.prototype.product = function() {
    var node = new Node("PRODUCT");
    node.add(this.power());
    
    while (true) {
        if (this.accept("TTIMES")) {
            node.add(this.power());
        }
        else if (this.accept("TDIVIDE")) {
            // To avoid implementing a special rule for quotients, every
            // term to be divided is simply wrapped in a node that takes
            // the reciprocal of its value when evaluated.
            node.add(new Node("INVERSE").add(this.power()));
        }
        else if (this.accept("TLPAREN")) {
            node.add(this.orderExpression());
            this.expect("TRPAREN");
        }
        else if (this.accept("TSYMBOL") ||
                 this.accept("TNUMBER") ||
                 this.accept("TFUNCTION")) {
            this.cursor--;
            node.add(this.power());
        }
        else {
            break;
        }
    }
    return node;
};

// Parses exponents.
Parser.prototype.power = function() {
    var node = new Node("POWER");
    node.add(this.val());

    // The `if` with recursion allows powers like `a ^ b ^ c` to be treated
    // like a ^ (b ^ c), as they should be.
    if (this.accept("TPOWER")) {
        node.add(this.power());
    }
    return node;
};

// Parses values or nested expressions.
Parser.prototype.val = function() {
    // Don't return new nodes immediately, since we need to parse
    // factorials, which come at the END of values.
    var node = {};

    if (this.accept("TSYMBOL")) {
        node = new Node("SYMBOL", this.prev().value);
    }
    else if (this.accept("TNUMBER")) {
        node = new Node("NUMBER", parseFloat(this.prev().value));
    }
    else if (this.accept("TCOMMAND")) {
        var prev = this.prev();
        node = new Node("FUNCTION", prev.value);

        for (var i = 0; i < arity[prev.value.name]; i++) {
            node.add(this.val());
        }
    }
    else if (this.accept("TFUNCTION")) {
        node = new Node("FUNCTION", this.prev().value);

        // Multi-param functions require parens and may have commas
        if (this.accept("TLPAREN")) {
            node.add(this.orderExpression());

            while (this.accept("TCOMMA")) {
                node.add(this.orderExpression());
            }

            this.expect("TRPAREN");
        }

        // Single-parameter functions don't need parens
        else {
            node.add(this.power());
        }
    }

    // Parse negative values like -42.
    // The lexer can't differentiate between a difference and a negative,
    // so that distinction is done here.
    // Notice the `power()` rule that comes after a negative sign so that
    // expressions like `-4^2` return -16 instead of 16.
    else if (this.accept("TMINUS")) {
        node = new Node("NEGATE");
        node.add(this.power());
    }

    // Parse nested expression with parentheses.
    // Notice that the parser expects an RPAREN token after the expression.
    else if (this.accept("TLPAREN")) {
        node = this.orderExpression();
        this.expect("TRPAREN");
    }

    // Parse absolute value.
    // Absolute values are contained in pipes (`|`) and are treated quite
    // like parens.
    else if (this.accept("TABS")) {
        node = new Node("FUNCTION", Math.abs);
        node.add(this.orderExpression());
        this.expect("TABS");
    }

    // All parsing rules should have terminated or recursed by now.
    // Throw an exception if this is not the case.
    else {
        throw "Unexpected " + this.current().type + ", token " + this.cursor;
    }

    // Process postfix operations like factorials.
    
    // Parse factorial.
    if (this.accept("TBANG")) {
        var factNode = new Node("FACTORIAL");
        factNode.add(node);
        return factNode;
    }

    return node;
};

},{"./Node":3,"./Token":5,"./utils/arity":6,"./utils/replacementTable":10}],5:[function(require,module,exports){
// A `Token` is a generic construct that has a `type` and `value`. Tokens are used by the lexer and parser.
// The lexer assigns each token a type, such as `NUMBER`; and a value, such as the actual numeric value of the token.
var Token = module.exports = function(type, value) {
    if (value === undefined) value = "";

    this.type = type;
    this.value = value;
};

Token.prototype.equals = function(type, value) {
    if (value === undefined) {
        return this.type === type;
    }
    else {
        return this.type === type &&
               this.value === value;
    }
};

Token.prototype.toString = function() {
    return this.type + "(" + this.value + ")";
};
},{}],6:[function(require,module,exports){
// List of arities for LaTeX commands. Since LaTeX command arguments aren't delimited by parens, we'll cheat a bit and provide a bit of context to the parser about how to parse each command.
module.exports = {
    "frac": 2,
    "sqrt": 1,
    "sin": 1,
    "cos": 1,
    "tan": 1,
    "asin": 1,
    "acos": 1,
    "atan": 1,
    "sec": 1,
    "csc": 1,
    "cot": 1,
    "asec": 1,
    "acsc": 1,
    "acot": 1,
};
},{}],7:[function(require,module,exports){
// Function to interpolate strings. It will return a new string, replacing every instance of the '%' character with an argument.
// Usage: interpolate("Letter % Number %", "A", 3) -> "Letter A Number 3"
module.exports = function interpolate(str) {
    var newString = "";
    var counter = 1;

    for (var i = 0; i < str.length; i++) {
        var current = str.charAt(i);
        var prev = str.charAt(i - 1) || "";
        var next = str.charAt(i + 1) || "";

        if (current == "%" && prev != "\\") {
            newString += arguments[counter];
            counter++;
        }
        else if (current == "\\" && next == "%") {

        }
        else {
            newString += current;
        }
    }

    return newString;
};
},{}],8:[function(require,module,exports){
// Helper method to check whether a value exists and is, in fact, a number.
module.exports = function isNumber(a) {
    return a !== null && isFinite(a);
}
},{}],9:[function(require,module,exports){
// Map of convenient functions missing from Javascript's Math API. These will be mixed in to the local variables when expressions are being evaluated.
module.exports = {
    frac: function frac(a, b) {
        return a / b;
    },
    logn: function logn(x, n) {
        return Math.log(x) / Math.log(n);
    },
    rootn: function rootn(x, n) {
        return Math.pow(x, 1/n);
    },
    sec: function src(x) {
        return 1 / Math.cos(x);
    },
    csc: function csc(x) {
        return 1 / Math.sin(x);
    },
    cot: function cot(x) {
        return 1 / Math.tan(x);
    }
};
},{}],10:[function(require,module,exports){
var Token = require("../Token");

// This table lists tokens that should be replaced by other tokens before parsing.
// The key has format "{token type}:{token value}"
module.exports = {
    "TCOMMAND:\\left(": new Token("TLPAREN", "("),
    "TCOMMAND:\\right)": new Token("TRPAREN", ")"),
    "TCOMMAND:\\left[": new Token("TLPAREN", "["),
    "TCOMMAND:\\right]": new Token("TRPAREN", "]")
};
},{"../Token":5}],11:[function(require,module,exports){
// List of token types with the regexes that match that token. Tokens are listed in order of precedence. Tokens higher in the list will be matched first. All token types begin with a 'T' to differentiate them from node types.
module.exports = {
    // Match (, [, {.
    TLPAREN: /[\(\[\{]/,

    // Match ), ], }.
    TRPAREN: /[\)\]\}]/,
    TPLUS: /\+/,
    TMINUS: /\-/,
    TTIMES: /\*/,
    TDIVIDE: /\//,
    TCOMMAND: /\\[A-Za-z]+[\(\)\[\]]?/,
    TSYMBOL: /[A-Za-z][A-Za-z0-9]*/,
    TWS: /\s+/, // Whitespace
    TABS: /\|/,
    TBANG: /!/,
    TCOMMA: /,/,
    TPOWER: /\^/,
    TNUMBER: /\d+(\.\d+)?/
};
},{}]},{},[1]);
