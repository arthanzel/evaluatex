(function() {
// The lexer reads a math expression and breaks it down into easily-digestible "tokens".
// A string of tokens, such as `NUMBER(4) PLUS NUMBER(2)` can be more easily understood by machines than raw math.
var Lexer = function(buffer) {
    this.buffer = buffer;
    this.cursor = 0;
};

// Returns true if there are more tokens to be read from the buffer.
Lexer.prototype.hasNext = function() {
    return this.cursor < this.buffer.length;
};

// Gets the next token in the stream.
Lexer.prototype.next = function() {
    // Try matching each token in `this.tokenMap`.
    for (k in TOKENS) {
        var match = TOKENS[k].exec(this.buffer.substring(this.cursor));
        // A matching token *must* begin immediately at the cursor, otherwise
        // it probably appears later in the buffer.
        if (match && match.index == 0) {
            this.cursor += match[0].length;
            return new Token(k, match[0]);
        }
    }
    throw "Can't match token at pos " + this.buffer.substring(this.cursor);
};

// Returns a list of all tokens for this lexer.
Lexer.prototype.tokens = function() {
    var tokens = [];
    while (this.hasNext()) {
        tokens.push(this.next());
    }
    return tokens;
};
// Parser
// ======

// The parser takes a list of Token objects and tries to construct a syntax
// tree that represents the math to be evaluated, taking into account the
// correct order of operations.
// This is a simple recursive-descent parser based on [Wikipedia's example](https://en.wikipedia.org/wiki/Recursive_descent_parser).
var Parser = function(tokens, locals) {
    this.locals = locals || {};
    this.tokens = [];
    this.cursor = 0;

    // Copy the local convenience functions into the `locals` object
    for (i in LOCAL_FNS) {
        this.locals[i] = LOCAL_FNS[i];
    }

    // Strip whitespace from token list.
    for (i in tokens) {
        if (tokens[i].type != "TWS") {
            this.tokens.push(tokens[i]);
        }
    }
    this.preprocess(locals);

    
};

Parser.prototype.preprocess = function(locals) {
    for (i in this.tokens) {
        var previous = this.tokens[i - 1] || null;
        var current = this.tokens[i];
        var next = this.tokens[i + 1] || null;

        // Replace symbol tokens with function tokens if the symbol exists in the Math API or in the locals.
        if (current.type == "TSYMBOL") {
            if (typeof Math[current.value] == "function") {
                current = new Token("TFUNCTION", Math[current.value]);
            }
            else if (typeof locals[current.value] == "function") {
                current = new Token("TFUNCTION", Math[current.value]);
            }

            continue;
        }

        // Remove the slash in command tokens and convert to lower case
        if (current.type == "TCOMMAND") {
            current.value = current.value.substring(1).toLowerCase();
            continue;
        }

        // Add TIMES tokens in implicit multiplication.
        // Implicit multiplication looks something like `4x` or `(1+x)(x-3)`.
        // Doing this now makes the recursive parsing a lot simpler.
        // for (var i = 0; i < this.tokens.length - 1; i++) {
        //     var current = this.tokens[i];
        //     var next = this.tokens[i+1];

        //     if (current.type == "TNUMBER" && next.type == "TSYMBOL") {
        //         this.tokens.splice(i + 1, 0, new Token("TTIMES"));
        //         i++;
        //     }
        //     // else if (current.type == "TSYMBOL" && next.type == "TSYMBOL") {
        //     //     this.tokens.splice(i + 1, 0, new Token("TTIMES"));
        //     //     i++;
        //     // }
    }
};

// The primary entry point of the parser - calling `parse()` will return a
// full AST that represents the provided tokens.
Parser.prototype.parse = function() {
    var o = this.orderExpression();
    console.log(o);
    var tree = o.simplify();

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

// Parses a mathematical expression with respect to the order of operations.
// Currently just a better-named alias for `sum()`.

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
    var node = new SumNode();
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
            node.add(new NegateNode.add(this.product()));
        }
        else {
            break;
        }
    }

    return node;
};

// Parses products and quotients.
Parser.prototype.product = function() {
    var node = new ProductNode();
    node.add(this.power());
    
    while (true) {
        if (this.accept("TTIMES")) {
            node.add(this.power());
        }
        else if (this.accept("TDIVIDE")) {
            // To avoid implementing a special rule for quotients, every
            // term to be divided is simply wrapped in a node that takes
            // the reciprocal of its value when evaluated.
            node.add(new InverseNode.add(this.power()));
        }
        else if (this.accept("TLPAREN")) {
            node.add(this.orderExpression());
            this.expect("TRPAREN");
        }
        else if (this.accept("TSYMBOL")) {
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
    var node = new PowerNode();
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
        node = new SymbolNode(this.prev().value);
    }
    else if (this.accept("TNUMBER")) {
        node = new NumberNode(parseFloat(this.prev().value));
    }
    // else if (this.accept("TCOMMAND")) {
    //     var commandValue = this.prev().value;
    //     node = new CommandNode(commandValue);

    //     for (var i = 0; i < ARITY[commandValue]; i++) {
    //         console.log(i);
    //         node.add(this.val());
    //     }
    // }
    else if (this.accept("TFUNCTION")) {
        node = new FunctionNode(this.prev().value);

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
        node = new NegateNode();
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
        node = new FunctionNode(Math.abs);
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
        var factNode = new FactorialNode();
        factNode.add(node);
        return factNode;
    }

    return node;
};
// A `Token` is a generic construct that has a `type` and `value`. Tokens are used by the lexer and parser.
// The lexer assigns each token a type, such as `NUMBER`; and a value, such as the actual numeric value of the token.
var Token = function(type, value) {
    if (value === undefined) value = "";

    this.type = type;
    this.value = value;

    this.equals = function(type, value) {
        if (value === undefined) {
            return this.type === type;
        }
        else {
            return this.type === type &&
                   this.value === value;
        }
    };

    this.toString = function() {
        return this.type + "(" + this.value + ")";
    };
};
// Map of convenient functions missing from Javascript's Math API. These will be mixed in to the local variables when expressions are being evaluated.
var LOCAL_FNS = {
    frac: function(a, b) {
        return a / b;
    },
    logn: function(x, n) {
        return Math.log(x) / Math.log(n);
    },
    rootn: function(x, n) {
        return Math.pow(x, 1/n);
    },
    asec: function(x) {
        return 1 / Math.cos(x);
    },
    acsc: function(x) {
        return 1 / Math.sin(x);
    },
    acot: function(x) {
        return 1 / Math.tan(x);
    }
};

// List of token types with the regexes that match that token. Tokens are listed in order of precedence. Tokens higher in the list will be matched first. All token types begin with a 'T' to differentiate them from node types.
var TOKENS = {
    // Match (, [, {.
    TLPAREN: /[\(\[\{]/,

    // Match ), ], }.
    TRPAREN: /[\)\]\}]/,
    TPLUS: /\+/,
    TMINUS: /\-/,
    TTIMES: /\*/,
    TDIVIDE: /\//,
    TCOMMAND: /\\[A-Za-z]+/,
    TSYMBOL: /[A-Za-z][A-Za-z0-9]*/,
    TWS: /\s+/, // Whitespace
    TABS: /\|/,
    TBANG: /!/,
    TCOMMA: /,/,
    TPOWER: /\^/,
    TNUMBER: /\d+(\.\d+)?/
};

// List of arities for LaTeX commands. Since LaTeX command arguments aren't delimited by parens, we'll cheat a bit and provide a bit of context to the parser about how to parse each command.
var ARITY = {
    "frac": 2,
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

var isNumber = function(a) {
    return a !== null && isFinite(a);
}
function createNode() {
    
};

// This represents an AST node.
// Like tokens, nodes have a type and value.
// Nodes contain zero or more child nodes.
var Node = function(value) {
    if (value === undefined) value = "";

    //this.type = type;
    this.value = value;
    this.unary = false;
    this.children = [];

    this.add = function(node) { this.children.push(node); return this; };

    this.evaluate = function(locals) {
        throw "Unable to evaluate abstract node";
    };
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
    console.log(indent + this.type + 
        (this.value ? " " + this.value : "") +
        " (" + this.children.length + ")");

    // Print each child.
    for (var i in this.children) {
        this.children[i].printTree(level + 1);
    }
};

// Simplifies this Node and all children recursively, returning a new
// node tree.
// Simplification removes all Nodes with one child, unless the node's `unary` flag is set.
Node.prototype.simplify = function() {
    if (this.children.length > 1 || this.unary) {
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
var FactorialNode = function() {
    Node.apply(this, arguments);
    this.unary = true;

    this.evaluate = function(locals) {
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
    };
};
FactorialNode.prototype = Node.prototype;
var FunctionNode = function() {
    Node.apply(this, arguments);
    this.unary = true;

    this.evaluate = function(locals) {
        var evaluatedChildren = [];
        for (i in this.children) {
            evaluatedChildren.push(this.children[i].evaluate(locals));
        }
        return this.value.apply(this, evaluatedChildren);
    };
};
FunctionNode.prototype = Node.prototype;
var InverseNode = function() {
    Node.apply(this, arguments);
    this.unary = true;

    this.evaluate = function(locals) {
        return 1.0 / this.children[0].evaluate(locals);
    };
};
InverseNode.prototype = Node.prototype;
var NegateNode = function() {
    Node.apply(this, arguments);
    this.unary = true;

    this.evaluate = function(locals) {
        return -this.children[0].evaluate(locals);
    };
};
NegateNode.prototype = Node.prototype;
var NumberNode = function() {
    Node.apply(this, arguments);

    this.evaluate = function(locals) {
        return this.value;
    };
};
NumberNode.prototype = Node.prototype;
var PowerNode = function() {
    Node.apply(this, arguments);

    this.evaluate = function(locals) {
        return Math.pow(
            this.children[0].evaluate(locals),
            this.children[1].evaluate(locals)
        );
    };
};
PowerNode.prototype = Node.prototype;
var ProductNode = function() {
    Node.apply(this, arguments);

    this.evaluate = function(locals) {
        var result = 1;
        for (i in this.children) {
            result += this.children[i].evaluate(locals);
        }
        return result;
    };
};
ProductNode.prototype = Node.prototype;
var SumNode = function() {
    Node.apply(this, arguments);

    this.evaluate = function(locals) {
        result = 0;
        for (i in this.children) {
            result += this.children[i].evaluate(locals);
        }
        return result;
    };
};
SumNode.prototype = Node.prototype;
var SymbolNode = function() {
    Node.apply(this, arguments);

    this.evaluate = function(locals) {
        if (isNumber(Math[this.value])) {
            return Math[this.value]; 
        }
        else if (isNumber(locals[this.value])) {
            return locals[this.value];
        }
        throw "Symbol " + this.value +
              " is undefined or not a number";
    };
};
SymbolNode.prototype = Node.prototype;
    var Evaluatex = {};
    // This is the main function in the API.
    // It takes a math expression and a list of variables to which the expression refers.
    // This function automatically creates and invokes the lexer, parser, and evaluator.
    Evaluatex.evaluate = function(expression, locals) {
        locals = locals || {};

        // Extend the locals object with convenience functions:
        locals.logn = function(x, n) {
            return Math.log(x) / Math.log(n);
        };
        locals.rootn = function(x, n) {
            return Math.pow(x, 1/n);
        };
        locals.sec = function(x) {
            return 1 / Math.cos(x);
        };
        locals.csc = function(x) {
            return 1 / Math.sin(x);
        };
        locals.cot = function(x) {
            return 1 / Math.tan(x);
        };

        var l = new Lexer(expression);
        var p = new Parser(l.tokens(), locals);
        var tree = p.parse();
        return tree.evaluate(locals || {});
    };
    
    // Export stuff.
    if (module) {
        module.exports = Evaluatex;
    }
    var angular = angular || 0;
    if (angular !== 0) {
        angular.module("evaluatex", []).value("Evaluatex", Evaluatex);
    }
    if (!module && !angular) {
        window.Evaluatex = Evaluatex;
    }

})();