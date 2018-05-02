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