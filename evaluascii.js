(function() {
    var Evaluatex = {};

    Evaluatex.evaluate = function(expression, locals) {
        var l = new Evaluatex.Lexer(expression);
        var p = new Evaluatex.Parser(l.tokens());
        var tree = p.parse();
        return tree.evaluate(locals || {});
    };

    // Private Constants
    // =================
    var UNARY_NODES = ["FUNCTION", "NEGATE", "INVERSE"];
    
    // Helpful Objects
    // ===============
    var Token = Evaluatex.Token = function(type, value) {
        if (value === undefined) value = "";

        this.type = type;
        this.value = value;
    };

    var Node = Evaluatex.Node = function(type, value) {
        if (value === undefined) value = "";

        this.type = type;
        this.value = value;
        this.children = [];

        this.add = function(node) { this.children.push(node); return this; };
        this.isUnary = function() { return UNARY_NODES.indexOf(this.type) >= 0;};

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
                    result = 1.0/this.children[0].evaluate(locals);
                    break;
                default:
                    throw "Node not recognized: " + this.type;
                    break;
            }

            if (isNaN(result)) {
                throw "Evaluation error: a term evaluated to NaN";
            }

            return result;
        };

        this.printTree = function(level) {
            level = level || 0;

            // Generate the indent string from the current `level`
            var indent = "";
            var iString = "  ";
            for (var i = 0; i < level; i++) {
                indent += iString;
            };

            console.log(indent + this.type + 
                (this.value ? " " + this.value : "") +
                " (" + this.children.length + ")");
            for (var i in this.children) {
                var child = this.children[i];
                if (child.printTree === undefined) {
                    console.log(indent + iString + child);
                }
                else {
                    this.children[i].printTree(level + 1);
                }
            }
        };

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
    var Lexer = Evaluatex.Lexer = function(buffer) {
        this.buffer = buffer;
        this.cursor = 0;
        this.tokenMap = {
            COMMAND: /\\[\w\d]+/,
            SYMBOL: /[A-Za-z][A-Za-z0-9]*/,
            WS: /\s+/,
            COMMA: /,/,
            POW: /\^/,
            PLUS: /\+/,
            MINUS: /\-/,
            TIMES: /\*/,
            DIVIDE: /\//,
            EQ: /=/,
            LCURLY: /\{/,
            RCURLY: /\}/,
            LPAREN: /\(/,
            RPAREN: /\)/,
            NUMBER: /\d+(\.\d+)?/
        };
    };

    Lexer.prototype.next = function() {
        // Are we at the end of the buffer?
        if (this.cursor >= this.buffer.length) {
            return null;
        }

        for (k in this.tokenMap) {
            var match = this.tokenMap[k].exec(this.buffer.substring(this.cursor));
            if (match && match.index == 0) {
                this.cursor += match[0].length;
                return new Token(k, match[0]);
            }
        }
        throw "Can't match token at pos " + this.buffer.substring(this.cursor);
    };

    Lexer.prototype.tokens = function() {
        this.tokens = [];
        while (true) {
            var token = this.next();
            if (token != null) {
                this.tokens.push(token);
            }
            else {
                return this.tokens;
            }
        }
    };

    // Parser
    // ======
    Evaluatex.Parser = function(tokens) {
        this.tokens = [];
        this.cursor = 0;

        // Strip whitespace from token list
        for (i in tokens) {
            if (tokens[i].type != "WS") {
                this.tokens.push(tokens[i]);
            }
        }

        // Add TIMES tokens in implicit multiplication
        for (var i = 0; i < this.tokens.length - 1; i++) {
            var current = this.tokens[i];
            var next = this.tokens[i+1];

            if (current.type == "NUMBER" && next.type == "SYMBOL") {
                this.tokens.splice(i + 1, 0, new Token("TIMES"));
                i++;
            }
            else if (current.type == "NUMBER" && next.type == "LPAREN") {
                this.tokens.splice(i + 1, 0, new Token("TIMES"));
                i++;
            }
            else if (current.type == "SYMBOL" && next.type == "SYMBOL") {
                this.tokens.splice(i + 1, 0, new Token("TIMES"));
                i++;
            }
            else if (current.type == "RPAREN" && next.type == "LPAREN") {
                this.tokens.splice(i + 1, 0, new Token("TIMES"));
                i++;
            }
        }

        // Replace SYMBOL tokens with NUMBER or FUNCTION tokens
        for (i in this.tokens) {
            var current = this.tokens[i];
            if (current.type == "SYMBOL") {
                if (isFinite(Math[current.value])) {
                    this.tokens[i] = new Token("NUMBER", Math[current.value]);
                }
                else if (typeof Math[current.value] == "function") {
                    // The token's value will be the function object.
                    this.tokens[i] = new Token("FUNCTION", Math[current.value]);
                }
            }
        }
    };

    Evaluatex.Parser.prototype.parse = function() {
        var tree = this.orderExpression().simplify();

        if (this.current() != undefined) {
            throw "Expected end of input, but got " + this.current().type +
            " " + this.current().value;
        }

        return tree;
    };

    Evaluatex.Parser.prototype.accept = function(token) {
        if (!this.current()) return false;

        if (this.current().type == token) {
            this.cursor++;
            return true;
        }
        return false;
    };

    Evaluatex.Parser.prototype.expect = function(token) {
        if (!this.accept(token)) {
            throw "Expected " + token + " but got " +
                (this.current() ? this.current().value : "end of input.");
        }
    };

    Evaluatex.Parser.prototype.current = function() {
        return this.tokens[this.cursor];
    };

    Evaluatex.Parser.prototype.prev = function() {
        return this.tokens[this.cursor - 1];
    };

    Evaluatex.Parser.prototype.val = function() {
        if (this.accept("SYMBOL")) {
            return new Node("SYMBOL", this.prev().value);
        }
        else if (this.accept("FUNCTION")) {
            var node = new Node("FUNCTION", this.prev().value);

            // Multi-param functions require parens and may have commas
            if (this.accept("LPAREN")) {
                node.add(this.orderExpression());

                while (this.accept("COMMA")) {
                    node.add(this.orderExpression());
                }

                this.expect("RPAREN");
            }

            // Single-parameter functions don't need parens
            else {
                node.add(this.power());
            }

            return node;
        }
        else if (this.accept("MINUS")) {
            var node = new Node("NEGATE");
            node.add(this.power());
            return node;
        }
        else if (this.accept("NUMBER")) {
            return new Node("NUMBER", parseFloat(this.prev().value));
        }
        else if (this.accept("LPAREN")) {
            var node = this.orderExpression();
            this.expect("RPAREN");
            return node;
        }
        else {
            throw "Syntax Error at "+ this.current().value + ", token " + this.cursor;
        }
    };

    Evaluatex.Parser.prototype.orderExpression = function() {
        return this.sum();
    };

    Evaluatex.Parser.prototype.sum = function() {
        var node = new Node("SUM");
        node.add(this.product());
        
        while (true) {
            if (this.accept("PLUS")) {
                node.add(this.product());
            }
            else if (this.accept("MINUS")) {
                node.add(new Node("NEGATE").add(this.product()));
            }
            else {
                break;
            }
        }

        return node;
    };

    Evaluatex.Parser.prototype.product = function() {
        var node = new Node("PRODUCT");
        node.add(this.power());
        
        while (true) {
            if (this.accept("TIMES")) {
                node.add(this.power());
            }
            else if (this.accept("DIVIDE")) {
                node.add(new Node("INVERSE").add(this.power()));
            }
            else {
                break;
            }
        }
        return node;
    };

    Evaluatex.Parser.prototype.power = function() {
        var node = new Node("POWER");
        node.add(this.val());

        if (this.accept("POW")) {
            node.add(this.power());
        }
        return node;
    };

    module.exports = Evaluatex;
})();