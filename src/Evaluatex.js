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

    // Copy the local convenience functions into the `locals` object
    for (i in localFunctions) {
        locals[i] = localFunctions[i];
    }

    var l = new Lexer(expression, opts);
    var p = new Parser(l.tokens(), locals);
    var tree = p.parse();
    // tree.printTree();
    return tree.evaluate(locals || {});
};

// Export stuff.
if (module) {
    module.exports = Evaluatex;
}
var angular = angular || 0;
if (angular !== 0) {
    angular.module("evaluatex", []).value("Evaluatex", Evaluatex);
}
if (!module && !angular) {
    window.Evaluatex = Evaluatex;
}