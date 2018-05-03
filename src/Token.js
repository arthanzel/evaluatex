/**
 * Token represents a lexical token. It has a type and a value.
 * @param type (String) Token type. A list of types is found in "utils/tokens.js".
 * @param value Value of the token.
 */
export default class Token {
    constructor(type, value = "") {
        this.type = type;
        this.value = value;
        this.name = null; // Used in function and command tokens to retain the fn name when minified
    }

    equals(token) {
        return this.type === token.type &&
            this.value === token.value;
    }

    toString() {
        if (TRIVIAL_TOKENS.indexOf(this.type) >= 0) {
            return this.type;
        }

        const val = typeof this.value === "function" ? this.name : this.value;

        return `${ this.type }[${ val }]`;
    }

    static TYPE_LPAREN = "LPAREN";
    static TYPE_RPAREN = "RPAREN";
    static TYPE_PLUS = "PLUS";
    static TYPE_MINUS = "MINUS";
    static TYPE_TIMES = "TIMES";
    static TYPE_DIVIDE = "DIVIDE";
    static TYPE_COMMAND = "COMMAND";
    static TYPE_SYMBOL = "SYMBOL";
    static TYPE_WHITESPACE = "WHITESPACE";
    static TYPE_ABS = "ABSOLUTEVAL";
    static TYPE_BANG = "BANG";
    static TYPE_COMMA = "COMMA";
    static TYPE_POWER = "POWER";
    static TYPE_NUMBER = "NUMBER";

    static patterns = new Map([
        [Token.TYPE_LPAREN, /(\(|\[|{|\\left\(|\\left\[)/], // Match (, [, {, \left(, \left[
        [Token.TYPE_RPAREN, /(\)|]|}|\\right\)|\\right])/], // Match ), ], }, \right), \right]
        [Token.TYPE_PLUS, /\+/],
        [Token.TYPE_MINUS, /-/],
        [Token.TYPE_TIMES, /\*/],
        [Token.TYPE_DIVIDE, /\//],
        [Token.TYPE_COMMAND, /\\[A-Za-z]+/],
        [Token.TYPE_SYMBOL, /[A-Za-z_][A-Za-z_0-9]*/],
        [Token.TYPE_WHITESPACE, /\s+/], // Whitespace
        [Token.TYPE_ABS, /\|/],
        [Token.TYPE_BANG, /!/],
        [Token.TYPE_COMMA, /,/],
        [Token.TYPE_POWER, /\^/],
        [Token.TYPE_NUMBER, /\d+(\.\d+)?/]
    ]);
};

/**
 * Trivial tokens are those that can only have a single value, so printing their value is unnecessary.
 */
const TRIVIAL_TOKENS = ["TPLUS", "TMINUS", "TTIMES", "TDIVIDE", "TWS", "TABS", "TBANG", "TCOMMA", "TPOWER"];
