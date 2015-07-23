// List of token types with the regexes that match that token. Tokens are listed in order of precedence. Tokens higher in the list will be matched first. All token types begin with a 'T' to differentiate them from node types.
module.exports = {
    // Match (, [, {.
    TLPAREN: /[\(\[\{]/,

    // Match ), ], }.
    TRPAREN: /[\)\]\}]/,
    TPLUS: /\+/,
    TMINUS: /\-/,
    TTIMES: /\*/,
    TDIVIDE: /\//,
    TCOMMAND: /\\[A-Za-z]+/,
    TSYMBOL: /[A-Za-z][A-Za-z0-9]*/,
    TWS: /\s+/, // Whitespace
    TABS: /\|/,
    TBANG: /!/,
    TCOMMA: /,/,
    TPOWER: /\^/,
    TNUMBER: /\d+(\.\d+)?/
};