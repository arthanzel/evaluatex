(function() {
    var Evaluascii = {};

    // This is the main function in the API.
    // It takes a math expression and a list of variables to which the expression refers.
    // This function automatically creates and invokes the lexer, parser, and evaluator.
    Evaluascii.evaluate = function(expression, locals) {
        locals = locals || {};

        // Extend the locals object with convenience functions:
        locals.logn = function(x, n) {
            return Math.log(x) / Math.log(n);
        };

        var l = new Evaluascii.Lexer(expression);
        var p = new Evaluascii.Parser(l.tokens(), locals);
        var tree = p.parse();
        return tree.evaluate(locals || {});
    };

    // Private Constants
    // =================
    
    // List of AST nodes that are allowed to contain one child.
    // All other nodes with one child will be removed when the AST is simplified.
    var UNARY_NODES = ["FUNCTION", "NEGATE", "INVERSE", "FACT"];

    // List of token types with the regexes that match that token.
    // Tokens are listed in order or precedence - tokens higher in this list
    // will be matched first.
    // Token types begin with a 'T' to differentiate them from node types.
    var TOKENS = {
        TCOMMAND: /\\[A-Za-z]+/,
        TSYMBOL: /[A-Za-z][A-Za-z0-9]*/,
        TWS: /\s+/,
        TABS: /\|/,
        TBANG: /!/,
        TCOMMA: /,/,
        TPOWER: /\^/,
        TPLUS: /\+/,
        TMINUS: /\-/,
        TTIMES: /\*/,
        TDIVIDE: /\//,
        TLPAREN: /[\(\[\{]/,
        TRPAREN: /[\)\]\}]/,
        TNUMBER: /\d+(\.\d+)?/
    };
    
    // Helpful Objects
    // ===============
    
    // This represents a lexer token.
    // Tokens have a `type` (e.g. NUMBER, SYMBOL, PLUS), and a `value` contained
    // within the token (e.g. the actual number for a NUMBER type token).
    var Token = Evaluascii.Token = function(type, value) {
        if (value === undefined) value = "";

        this.type = type;
        this.value = value;

        this.toString = function() { return this.type + "(" + this.value + ")" };
    };

    // This represents an AST node.
    // Like tokens, nodes have a type and value.
    // Nodes contain zero or more child nodes.
    var Node = Evaluascii.Node = function(type, value) {
        if (value === undefined) value = "";

        this.type = type;
        this.value = value;
        this.children = [];

        this.add = function(node) { this.children.push(node); return this; };
        this.isUnary = function() { return UNARY_NODES.indexOf(this.type) >= 0;};

        // Numerically evaluates the current node, and any children.
        this.evaluate = function(locals) {
            var result = 0;

            switch (this.type) {
                case "NUMBER":
                    result = this.value;
                    break;
                case "SYMBOL":
                    if (locals[this.value] == null || !isFinite(locals[this.value])) {
                        throw "Symbol " + this.value + " is undefined or not a number."
                    }
                    result = locals[this.value];
                    break;
                case "SUM":
                    result = 0;
                    for (i in this.children) {
                        result += this.children[i].evaluate(locals);
                    }
                    break;
                case "PRODUCT":
                    result = 1;
                    for (i in this.children) {
                        result *= this.children[i].evaluate(locals);
                    }
                    break;
                case "POWER":
                    result = Math.pow(this.children[0].evaluate(locals),
                                    this.children[1].evaluate(locals));
                    break;
                case "FUNCTION":
                    var evaluatedChildren = [];
                    for (i in this.children) {
                        evaluatedChildren.push(this.children[i].evaluate(locals));
                    }

                    result = this.value.apply(this, evaluatedChildren);
                    break;
                case "NEGATE":
                    result = -this.children[0].evaluate(locals);
                    break;
                case "INVERSE":
                    result = 1.0 / this.children[0].evaluate(locals);
                    break;
                case "FACT":
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
                    break;
                default:
                    throw "Node not recognized: " + this.type;
                    break;
            }

            if (isNaN(result)) {
                throw "Evaluation error: a term evaluated to NaN.";
            }

            return result;
        };

        // Prints a tree-like representation of this Node and its children to the console.
        // Useful for debugging parser problems.
        // If `printTree` is called on the root node, it prints the whole AST!
        this.printTree = function(level) {
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
        // Simplification removes all Nodes with one child, unless they were
        // defined in `UNARY_NODES` above.
        this.simplify = function() {
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
    };

    // Lexer
    // =====
    
    // The lexer reads a math expression and breaks it down into easily-digestible
    // "tokens".
    // A string of tokens, such as `NUMBER(4) PLUS NUMBER(2)` can be more easily
    // understood by machines than raw math.
    var Lexer = Evaluascii.Lexer = function(buffer) {
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
    Evaluascii.Parser = function(tokens, locals) {
        this.locals = locals || {};
        this.tokens = [];
        this.cursor = 0;

        // The first few passes of the parser recognize common motifs in the
        // list of tokens and apply some simple transformations:

        // Strip whitespace from token list.
        for (i in tokens) {
            if (tokens[i].type != "TWS") {
                this.tokens.push(tokens[i]);
            }
        }

        // Add TIMES tokens in implicit multiplication.
        // Implicit multiplication looks something like `4x` or `(1+x)(x-3)`.
        // Doing this now makes the recursive parsing a lot simpler.
        for (var i = 0; i < this.tokens.length - 1; i++) {
            var current = this.tokens[i];
            var next = this.tokens[i+1];

            if (current.type == "TNUMBER" && next.type == "TSYMBOL") {
                this.tokens.splice(i + 1, 0, new Token("TTIMES"));
                i++;
            }
            else if (current.type == "TSYMBOL" && next.type == "TSYMBOL") {
                this.tokens.splice(i + 1, 0, new Token("TTIMES"));
                i++;
            }
        }

        // Replace SYMBOL tokens with NUMBER or FUNCTION tokens if the symbols
        // exist in Javascript's `Math` object.
        for (i in this.tokens) {
            var current = this.tokens[i];
            if (current.type == "TSYMBOL") {
                // If the symbol is a Math constant
                if (isFinite(Math[current.value])) {
                    this.tokens[i] = new Token("TNUMBER", Math[current.value]);
                }

                // If the symbol is a Math function
                else if (typeof Math[current.value] == "function") {
                    // The token's value will be the function object.
                    this.tokens[i] = new Token("TFUNCTION", Math[current.value]);
                }

                // If the symbol is a local function
                else if (typeof locals[current.value] == "function") {
                    this.tokens[i] = new Token("TFUNCTION", locals[current.value]);
                }
            }
        }
    };

    // The primary entry point of the parser - calling `parse()` will return a
    // full AST that represents the provided tokens.
    Evaluascii.Parser.prototype.parse = function() {
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
    Evaluascii.Parser.prototype.accept = function(token) {
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
    Evaluascii.Parser.prototype.expect = function(token) {
        if (!this.accept(token)) {
            throw "Expected " + token + " but got " +
                (this.current() ? this.current().value : "end of input.");
        }
    };

    // Returns the current token under the cursor.
    // This is the token that `accept()` will try to match.
    Evaluascii.Parser.prototype.current = function() {
        return this.tokens[this.cursor];
    };

    // Returns the previously-matched token.
    // Useful when you `accept()` a token and need to get its value later.
    Evaluascii.Parser.prototype.prev = function() {
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
    Evaluascii.Parser.prototype.orderExpression = function() {
        // orderExpression = sum

        return this.sum();
    };

    // Parses sums or differences.
    Evaluascii.Parser.prototype.sum = function() {
        // sum : product { ('+'|'-') product }

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
    Evaluascii.Parser.prototype.product = function() {
        // product : power { ('*'|'/') power }
        //         | power '(' orderExpression ')'

        var node = new Node("PRODUCT");
        node.add(this.power());
        
        while (true) {
            if (this.accept("TTIMES")) {
                node.add(this.power());
            }
            else if (this.accept("TLPAREN")) {
                node.add(this.orderExpression());
                this.expect("TRPAREN");
            }
            else if (this.accept("TDIVIDE")) {
                // To avoid implementing a special rule for quotients, every
                // term to be divided is simply wrapped in a node that takes
                // the reciprocal of its value when evaluated.
                node.add(new Node("INVERSE").add(this.power()));
            }
            else {
                break;
            }
        }
        return node;
    };

    // Parses exponents.
    Evaluascii.Parser.prototype.power = function() {
        // power: val { '^' power }

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
    Evaluascii.Parser.prototype.val = function() {
        // val : SYMBOL
        //     | NUMBER
        //     | FUNCTION '(' orderExpression { ',' orderExpression } ')'
        //     | '-' val
        //     | '(' orderExpression ')'
        //     | '|' orderExpression '|'
        //     | val '!'

        // Don't return new nodes immediately, since we need to parse
        // factorials, which come at the END of values.
        var node = {};

        if (this.accept("TSYMBOL")) {
            node = new Node("SYMBOL", this.prev().value);
        }
        else if (this.accept("TNUMBER")) {
            node = new Node("NUMBER", parseFloat(this.prev().value));
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
            var factNode = new Node("FACT");
            factNode.add(node);
            return factNode;
        }

        return node;
    };

    // Export stuff.
    if (module) {
        module.exports = Evaluascii;
    }
    var angular = angular || 0;
    if (angular !== 0) {
        angular.module("evaluascii", []).value("Evaluascii", Evaluascii);
    }
    if (!module && !angular) {
        window.Evaluascii = Evaluascii;
    }
})();