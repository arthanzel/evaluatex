var Node = require("./Node");
var Token = require("./Token");
var arity = require("../src/util/arities");
var replacementTable = require("../src/util/replaceToken");

// Parser
// ======

// The parser takes a list of Token objects and tries to construct a syntax
// tree that represents the math to be evaluated, taking into account the
// correct order of operations.
// This is a simple recursive-descent parser based on [Wikipedia's example](https://en.wikipedia.org/wiki/Recursive_descent_parser).
var Parser = module.exports = function(tokens, locals) {
    this.constants = locals || {};
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
