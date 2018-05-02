import Node from "./Node";
import { fact } from "./util/localFunctions";

// Parser
// ======

// The parser takes a list of Token objects and tries to construct a syntax
// tree that represents the math to be evaluated, taking into account the
// correct order of operations.
// This is a simple recursive-descent parser based on [Wikipedia's example](https://en.wikipedia.org/wiki/Recursive_descent_parser).

export default function parser(tokens) {
    let p = new Parser(tokens);
    return p.parse();
};

class Parser {
    constructor(tokens = []) {
        this.cursor = 0;
        this.tokens = tokens;
    }

    get currentToken() {
        return this.tokens[this.cursor];
    }

    get prevToken() {
        return this.tokens[this.cursor - 1];
    }

    parse() {
        //this.preprocess();
        let ast = this.sum();
        ast = ast.simplify();

        // Throw an exception if there are still tokens remaining after parsing
        if (this.currentToken !== undefined) {
            console.log(ast.printTree());
            throw "Parsing error: Expected end of input, but got " + this.currentToken.type +
            " " + this.currentToken.value;
        }

        return ast;
    }

    //preprocess() {
        // This function used to contain procedures to remove whitespace
        // tokens and replace symbol tokens with functions, but that work
        // has been moved to the lexer in order to keep the parser more
        // lightweight.
    //}

    /**
     * Accepts the current token if it matches the given type.
     * If it does, the cursor is incremented and this method returns true.
     * If it doesn't, the cursor stays where it is and this method returns false.
     * @param type Type of token to accept.
     * @returns {boolean} True if the token was accepted.
     */
    accept(type) {
        if (this.currentToken && this.currentToken.type === type) {
            this.cursor++;
            return true;
        }
        return false;
    }

    /**
     * Accepts the current token if it matches the given type.
     * If it does, the cursor is incremented.
     * If it doesn't, an exception is raised.
     * @param type
     */
    expect(type) {
        if (!this.accept(type)) {
            throw "Expected " + type + " but got " +
            (this.currentToken ? this.currentToken.value : "end of input.");
        }
    }

    // Rules
    // -----

    /**
     * Parses a math expression with
     */
    sum() {
        let node = new Node("SUM");
        node.addChild(this.product());

        while (true) {
            // Continue to accept chained addends
            if (this.accept("TPLUS")) {
                node.addChild(this.product());
            }
            else if (this.accept("TMINUS")) {
                node.addChild(new Node("NEGATE").addChild(this.product()));
            }
            else {
                break;
            }
        }

        return node;
    }

    product() {
        let node = new Node("PRODUCT");
        node.addChild(this.power());

        while (true) {
            // Continue to accept chained multiplicands

            if (this.accept("TTIMES")) {
                node.addChild(this.power());
            }
            else if (this.accept("TDIVIDE")) {
                node.addChild(new Node("INVERSE").addChild(this.power()));
            }
            else if (this.accept("TLPAREN")) {
                this.cursor--;
                node.addChild(this.power());
            }
            else if (this.accept("TSYMBOL") ||
                     this.accept("TNUMBER") ||
                     this.accept("TFUNCTION")) {
                this.cursor--;
                node.addChild(this.power());
            }
            else {
                break;
            }
        }

        return node;
    }

    power() {
        let node = new Node("POWER");
        node.addChild(this.val());

        // If a chained power is encountered (e.g. a ^ b ^ c), treat it like
        // a ^ (b ^ c)
        if (this.accept("TPOWER")) {
            node.addChild(this.power());
        }

        return node;
    }

    val() {
        // Don't create a new node immediately, since we need to parse postfix
        // operators like factorials, which come after a value.
        let node = {};

        if (this.accept("TSYMBOL")) {
            node = new Node("SYMBOL", this.prevToken.value);
        }
        else if (this.accept("TNUMBER")) {
            node = new Node("NUMBER", parseFloat(this.prevToken.value));
        }
        else if (this.accept("TFUNCTION")) {
            node = new Node("FUNCTION", this.prevToken.value);

            // Multi-param functions require parens and have commas
            if (this.accept("TLPAREN")) {
                node.addChild(this.sum());

                while (this.accept("TCOMMA")) {
                    node.addChild(this.sum());
                }

                this.expect("TRPAREN");
            }

            // Single-parameter functions don't need parens
            else {
                node.addChild(this.power());
            }
        }
        else if (this.accept("TMINUS")) {
            node = new Node("NEGATE").addChild(this.power());
        }
        else if (this.accept("TLPAREN")) {
            node = this.sum();
            this.expect("TRPAREN");
        }
        else if (this.accept("TABS")) {
            node = new Node("FUNCTION", Math.abs);
            node.addChild(this.sum());
            this.expect("TABS");
        }
        else {
            throw "Unexpected " + this.currentToken.type + ", token " + this.cursor;
        }

        if (this.accept("TBANG")) {
            let factNode = new Node("FUNCTION", fact);
            factNode.addChild(node);
            return factNode;
        }

        return node;
    }
}

/*
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
// power : TODO power
// val : SYMBOL
//     | NUMBER
//     | FUNCTION '(' orderExpression { ',' orderExpression } ')'
//     | '-' val
//     | '(' orderExpression ')'
//     | '{' orderExpression '}'
//     | '|' orderExpression '|'
//     | val '!'
// ```
*/

// Parses values or nested expressions.
//Parser.prototype.val = function() {
    // Don't return new nodes immediately, since we need to parse
    // factorials, which come at the END of values.
    //var node = {};




    // Parse negative values like -42.
    // The lexer can't differentiate between a difference and a negative,
    // so that distinction is done here.
    // Notice the `power()` rule that comes after a negative sign so that
    // expressions like `-4^2` return -16 instead of 16.


    // Parse nested expression with parentheses.
    // Notice that the parser expects an RPAREN token after the expression.


    // Parse absolute value.
    // Absolute values are contained in pipes (`|`) and are treated quite
    // like parens.


    // All parsing rules should have terminated or recursed by now.
    // Throw an exception if this is not the case.


    // Process postfix operations like factorials.

    // Parse factorial.


    //return node;
//};
