var tokens = require("./utils/tokens");
var Token = require("./Token");

// The lexer reads a math expression and breaks it down into easily-digestible "tokens".
// A string of tokens, such as `NUMBER(4) PLUS NUMBER(2)` can be more easily understood by machines than raw math.
var Lexer = module.exports = function(buffer, opts) {
    this.buffer = buffer;
    this.cursor = 0;
    this.opts = opts || {};
};

// Returns true if there are more tokens to be read from the buffer.
Lexer.prototype.hasNext = function() {
    return this.cursor < this.buffer.length;
};

// Gets the next token in the stream.
Lexer.prototype.next = function(len) {
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
    throw "Can't match token at pos " + this.buffer.substring(this.cursor);
};

// Returns a list of all tokens for this lexer.
Lexer.prototype.tokens = function() {
    var tokens = [];
    while (this.hasNext()) {
        var token = this.next();
        tokens.push(token);

        if (token.type == "TPOWER" && this.opts.latex) {
            var token2 = {};
            do {
                token2 = this.next(1);
            } while (token2.type == "TWS")
            tokens.push(token2);
        }
    }
    return tokens;
};