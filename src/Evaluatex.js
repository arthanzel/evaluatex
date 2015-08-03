var Lexer = require("./Lexer");
var Parser = require("./Parser");
var localFunctions = require("./utils/localFunctions");

var Evaluatex = {};
// This is the main function in the API.
// It takes a math expression and a list of variables to which the expression refers.
// This function automatically creates and invokes the lexer, parser, and evaluator.
Evaluatex.evaluate = function(expression, locals, opts) {
    locals = locals || {};
    opts = opts || {};

    // Copy the local convenience functions into the `locals` object.
    for (i in localFunctions) {
        locals[i] = localFunctions[i];
    }

    // Copy functions and constants from Math into the `locals` object.
    // These will mask defined locals.
    var mathKeys = Object.getOwnPropertyNames(Math);
    for (i in mathKeys) {
        var key = mathKeys[i];
        locals[key] = Math[key];
    }

    var l = new Lexer(expression, opts);
    var p = new Parser(l.tokens, locals);
    var tree = p.parse();

    // Debugging aid - prints the AST after every test.
    // Use `npm run test-tree` to set the PRINT_TREE flag.
    if (process.env.PRINT_TREE) {
        tree.printTree();
    }
    
    return tree.evaluate(locals || {});
};

// Export stuff.
if (module) {
    module.exports = Evaluatex;
}
var angular = angular || false;
if (angular) {
    angular.module("evaluatex", []).value("Evaluatex", Evaluatex);
}
var window = window || false;
if (!angular && window) {
    window.Evaluatex = Evaluatex;
}