var Token = require("../Token");

// This table lists tokens that should be replaced by other tokens before parsing.
// The key has format "{token type}:{token value}"
module.exports = {
    "TCOMMAND:\\left(": new Token("TLPAREN", "("),
    "TCOMMAND:\\right)": new Token("TRPAREN", ")"),
    "TCOMMAND:\\left[": new Token("TLPAREN", "["),
    "TCOMMAND:\\right]": new Token("TRPAREN", "]")
};