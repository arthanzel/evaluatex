var assert = require("chai").assert;

var Evaluatex = require("../evaluascii.js");
var ex1 = "\\frac{d} {dx} * \\sqrt{x}=6";
var math = "3^3^3";
var math2 = "-(one + (1 + -2 - 4 + 3) * someConst ^ -(3.14159 - sin 2 + 2) / 2)";

describe("Evaluatex.js", function() {
    it("passes", function() {
        //console.log(new Evaluatex(ex1).tokens());
    });

    it("parses", function() {
        var l = new Evaluatex.Lexer(math);
        var p = new Evaluatex.Parser(l.tokens());
        var tree = p.orderExpression().simplify();
        tree.printTree();
        console.log(tree.evaluate({ one: 1, someConst: 2 }));
    });
});
