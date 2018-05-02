// A `Token` is a generic construct that has a `type` and `value`. Tokens are used by the lexer and parser.
// The lexer assigns each token a type, such as `NUMBER`; and a value, such as the actual numeric value of the token.
var Token = module.exports = function(type, value) {
    if (value === undefined) value = "";

    this.type = type;
    this.value = value;
};

Token.prototype.equals = function(type, value) {
    if (value === undefined) {
        return this.type === type;
    }
    else {
        return this.type === type &&
               this.value === value;
    }
};

Token.prototype.toString = function() {
    return this.type + "(" + this.value + ")";
};