// List of arities for LaTeX commands. Since LaTeX command arguments aren't delimited by parens, we'll cheat a bit and provide a bit of context to the parser about how to parse each command.

/**
 * List of arities for LaTeX commands. Arguments for LaTeX commands aren't delimited by parens, so the compiler needs to know how many arguments to expect for each function.
 */
export default {
    "frac": 2,
    "sqrt": 1,
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