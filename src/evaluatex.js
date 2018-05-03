import lexer from "./lexer";
import parser from "./parser";

/**
 * Parses a given math expression and returns a function that computes the result.
 * @param {String} expression Math expression to parse.
 * @param {Object} constants A map of constants that will be compiled into the resulting function.
 * @param {Object} options Options to Evaluatex.
 * @returns {fn} A function that takes an optional map of variables. When invoked, this function computes the math expression and returns the result. The function has fields `ast` and `expression`, which respectively hold the AST and original math expression.
 */
export default function evaluatex(expression, constants = {}, options = {}) {
    const tokens = lexer(expression, constants, options);
    const ast = parser(tokens).simplify();
    const fn = function(variables = {}) { return ast.evaluate(variables); };
    fn.ast = ast;
    fn.expression = expression;
    fn.tokens = tokens;
    return fn;
}