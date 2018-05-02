/**
 * Token represents a lexical token. It has a type and a value.
 * @param type (String) Token type. A list of types is found in "utils/tokens.js".
 * @param value Value of the token.
 */
export default class Token {
    constructor(type, value = "") {
        this.type = type;
        this.value = value;
    }

    equals(token) {
        return this.type === token.type &&
            this.value === token.value;
    }

    toString() {
        if (TRIVIAL_TOKENS.indexOf(this.type) >= 0) {
            return this.type;
        }

        // Does the value contain a function? If so, print a human-readable name.
        let value = typeof this.value === "function" ? this.value.name : this.value;

        return this.type + "[" + value + "]";
    }
};

export let tokenPatterns = [
    // Match (, [, {.
    ["TLPAREN", /[(\[{]/],

    // Match ), ], }.
    ["TRPAREN", /[)\]}]/],

    ["TPLUS", /\+/],
    ["TMINUS", /-/],
    ["TTIMES", /\*/],
    ["TDIVIDE", /\//],
    ["TSYMBOL", /[A-Za-z][A-Za-z0-9]*/],
    ["TWS", /\s+/], // Whitespace
    ["TABS", /\|/],
    ["TBANG", /!/],
    ["TCOMMA", /,/],
    ["TPOWER", /\^/],
    ["TNUMBER", /\d+(\.\d+)?/]
];

/**
 * Trivial tokens are those that can only have a single value, so printing their value is unnecessary.
 */
let TRIVIAL_TOKENS = ["TPLUS", "TMINUS", "TTIMES", "TDIVIDE", "TWS", "TABS", "TBANG", "TCOMMA", "TPOWER"];