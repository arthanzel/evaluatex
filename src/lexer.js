import Token from "./Token";
import localFunctions from "./util/localFunctions";

/**
 * The lexer reads a math expression and breaks it down into easily-digestible Tokens.
 * A list of valid tokens can be found lower in this file.
 * @param equation (String) The equation to lex.
 * @param locals (Object) An object of functions and variables.
 * @returns {Array} An array of Tokens.
 */
export default function lexer(equation, locals = {}) {
    let l = new Lexer(equation, locals);
    l.lex();

    // toString() each token and concatenate into a big string. Useful for debugging.
    l.tokens.toString = () => l.tokens.map(token => token.toString()).join(" ");

    return l.tokens;
}

class Lexer {
    constructor(buffer, constants) {
        this.buffer = buffer;
        this.constants = Object.assign({}, constants, localFunctions);
        this.cursor = 0;
        this.tokens = [];
    }

    lex() {
        while (this.hasNext()) {
            let token = this.next();
            if (token.type === Token.TYPE_WHITESPACE) {
                // Whitespace tokens don't affect evaluation, so don't bother
                // adding them to the token list.
                continue;
            }
            if (token.type === Token.TYPE_SYMBOL) {
                // Symbols will need to be looked up during the evaluation phase.
                // If the symbol refers to things defined in either Math or
                // the locals, compile them, to prevent slow lookups later.
                if (typeof this.constants[token.value] === "function") {
                    token = new Token(Token.TYPE_FUNCTION, this.constants[token.value]);
                }
                else if (typeof this.constants[token.value] === "number") {
                    token = new Token(Token.TYPE_NUMBER, this.constants[token.value]);
                }
            }
            this.tokens.push(token);
        }
    }

    hasNext() {
        return this.cursor < this.buffer.length;
    }

    // Get the next token from the buffer
    next() {
        if (!this.hasNext()) {
            throw "Lexer error: reached end of stream";
        }

        // Try to match each pattern in tokenPatterns to the remaining buffer
        for (const [type, regex] of Token.patterns) {
            // Force the regex to match only at the beginning of the string
            const regexFromStart = new RegExp(/^/.source + regex.source);

            const remainingBuffer = this.buffer.substr(this.cursor);
            let match = regexFromStart.exec(remainingBuffer);
            if (match) {
                this.cursor += match[0].length;
                return new Token(type, match[0]);
            }
        }

        throw "Lexer error: can't match any token";
    }
}
