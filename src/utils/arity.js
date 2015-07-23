// List of arities for LaTeX commands. Since LaTeX command arguments aren't delimited by parens, we'll cheat a bit and provide a bit of context to the parser about how to parse each command.
module.exports = {
    "frac": 2,
    "sin": 1,
    "cos": 1,
    "tan": 1,
    "asin": 1,
    "acos": 1,
    "atan": 1,
    "sec": 1,
    "csc": 1,
    "cot": 1,
    "asec": 1,
    "acsc": 1,
    "acot": 1,
};