import Token from "./Token";
import arities from "./util/arities";
import localFunctions from "./util/localFunctions";

// Single-arg tokens are those that, when in LaTeX mode, read only one character as their argument OR a block delimited by { }. For example, `x ^ 24` would be read as `SYMBOL(x) POWER NUMBER(2) NUMBER(4).
const CHAR_ARG_TOKENS = [Token.TYPE_POWER, Token.TYPE_COMMAND];

const DEFAULT_OPTS = {
    latex: false
};

/**
 * The lexer reads a math expression and breaks it down into easily-digestible Tokens.
 * A list of valid tokens can be found lower in this file.
 * @param equation (String) The equation to lex.
 * @param constants (Object) An object of functions and variables.
 * @param opts Options.
 * @returns {Array} An array of Tokens.
 */
export default function lexer(equation, constants = {}, opts = DEFAULT_OPTS) {
    let l = new Lexer(equation, constants, opts);
    l.lex();

    // toString() each token and concatenate into a big string. Useful for debugging.
    l.tokens.toString = () => l.tokens.map(token => token.toString()).join(" ");

    return l.tokens;
}

class Lexer {
    constructor(buffer, constants, opts) {
        this.buffer = buffer;
        this.constants = Object.assign({}, constants, localFunctions);
        this.opts = opts;
        this.tokens = [];
    }

    lex() {
        this.lexExpression();
        this.replaceConstants();
        this.replaceCommands();
    }

    /**
     * Lexes an expression or sub-expression.
     */
    lexExpression(charMode = false) {
        while (this.hasNext()) {
            let token = charMode ? this.nextCharToken() : this.next();

            if (this.opts.latex && isCharArgToken(token)) {
                this.tokens.push(token);

                let arity = 1;
                if (token.type === Token.TYPE_COMMAND) {
                    arity = arities[token.value.substr(1).toLowerCase()];
                }
                for (let i = 0; i < arity; i++) {
                    this.lexExpression(true);
                }

                if (charMode) return;
            }
            else if (charMode && isStartGroupToken(token)) {
                this.tokens.push(token);
                this.lexExpression(false);
                return;
            }
            else if (charMode && !isStartGroupToken(token)) {
                // this.tokens.push(new Token(Token.TYPE_LPAREN, "{"));
                this.tokens.push(token);
                // this.tokens.push(new Token(Token.TYPE_RPAREN, "}"));
                return;
            }
            else if (isStartGroupToken(token)) {
                this.tokens.push(token);
                this.lexExpression(false);
            }
            else if (isEndGroupToken(token)) {
                this.tokens.push(token);
                return;
            }
            else {
                this.tokens.push(token);
            }
        }
    }

    hasNext() {
        return this.buffer.length > 0;
    }

    /**
     * Retrieves the next non-whitespace token from the buffer.
     * @param len
     * @returns {Token}
     */
    next(len = undefined) {
        if (!this.hasNext()) {
            throw "Lexer error: reached end of stream";
        }

        this.skipWhitespace();

        // Try to match each pattern in tokenPatterns to the remaining buffer
        for (const [type, regex] of Token.patterns) {
            // Force the regex to match only at the beginning of the string
            const regexFromStart = new RegExp(/^/.source + regex.source);

            // When `len` is undefined, substr reads to the end
            let match = regexFromStart.exec(this.buffer.substr(0, len));
            if (match) {
                this.buffer = this.buffer.substr(match[0].length);
                return new Token(type, match[0]);
            }
        }

        // TODO: Meaningful error
        throw "Lexer error: can't match any token";
    }

    /**
     * Tokenizes the next single character of the buffer, unless the following token is a LaTeX command, in which case the entire command is tokenized.
     */
    nextCharToken() {
        this.skipWhitespace();
        if (this.buffer.charAt(0) === "\\") {
            return this.next();
        }
        return this.next(1);
    }

    replaceCommands() {
        for (const token of this.tokens) {
            if (token.type === Token.TYPE_COMMAND) {
                const fnName = token.value.substr(1).toLowerCase();
                token.value = this.constants[fnName];
            }
        }
    }

    replaceConstants() {
        for (const i in this.tokens) {
            const token = this.tokens[i];

            if (token.type === Token.TYPE_SYMBOL) {
                // Symbols will need to be looked up during the evaluation phase.
                // If the symbol refers to things defined in either Math or
                // the locals, compile them, to prevent slow lookups later.
                if (typeof this.constants[token.value] === "function") {
                    this.tokens[i] = new Token(Token.TYPE_FUNCTION, this.constants[token.value]);
                }
                else if (typeof this.constants[token.value] === "number") {
                    this.tokens[i] = new Token(Token.TYPE_NUMBER, this.constants[token.value]);
                }
            }
        }
    }

    /**
     * Removes whitespace from the beginning of the buffer.
     */
    skipWhitespace() {
        const regex = new RegExp(/^/.source + Token.patterns.get(Token.TYPE_WHITESPACE).source);
        this.buffer = this.buffer.replace(regex, "");
    }
}

function isCharArgToken(token) {
    return CHAR_ARG_TOKENS.indexOf(token.type) !== -1;
}

function isStartGroupToken(token) {
    return token.type === Token.TYPE_LPAREN && token.value === "{";
}

function isEndGroupToken(token) {
    return token.type === Token.TYPE_RPAREN && token.value === "}";
}
