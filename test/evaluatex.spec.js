var assert = require("chai").assert;
require("./helpers/aboutEqual");

var Evaluatex = require("../src/evaluatex.js");

var formulae = [
    ["(-b + sqrt(b^2 - 4 * a * c)) / (2 * a)", 3, { a: 2, b : -4, c: -6 }],
    ["(-b + sqrt(b^2 - 4a * c)) / (2 a)", 3, { a: 2, b : -4, c: -6 }],

    // Actual TeX typesetting
    ["\\frac 4 2", 2],
    ["\\frac 4 2 ^ 3", 8],
    ["\\frac {4 ^ 2} 3", 16/3],
    ["\\frac (4 ^ 2) 3", 16/3],
    ["\\frac{1}{2}x^{-\\frac{1}{2}}", 1/6, { x: 9 } ]
];

var test = function(expression, result, locals, opts) {
    assert.aboutEqual(Evaluatex.evaluate(expression, locals, opts), result);
};

describe("Evaluatex.js", function() {
    it("evaluates simple formulae", function() {
        test("2", 2);
        test("-5 - -4", -1);
        test("(1 + 2 / 3 * 4 - 5)^2", 16/9);
    });

    it("evaluates variables", function() {
        test("x", 5, { x: 5 });
        test("x^2 + y^2 - 13", 0, { x: 3, y: 2 });
        test("x^y + z", 13, { x: 2, y: 3, z: 5 });
    });

    it("supports Javascript's Math functions and constants", function() {
        test("sin(PI) + tan(PI/4) + cos(-PI * 2)", 2);
        test("cos(PI)^2", 1);
        test("sqrt(LN2 + x)", Math.sqrt(Math.LN2 + 5), { x: 5 });
        test("hypot(10)", 10);
        test("hypot(3, 4)", 5);
        test("min(5, 4, 3, -2, 1)", -2);
    });

    it("supports absolute values", function() {
        test("|-5|", 5);
        test("|--5|", 5);
        test("2 * -|2 - 4|", -4);
    });

    it("supports factorials", function() {
        test("4!", 24);
        test("(4 + 1)!", 120);
        test("4 + 1 !", 5);
        test("3.9! + 3.1!", 30);
    });

    it("supports custom functions", function() {
        test("incr(5)", 6, { incr: function(a) { return a + 1; } });
        test("add(5, 6)", 11, { add: function(a, b) { return a + b; } });
    });

    it("supports parens", function() {
        test("{1 + [2 - {3 + 4}])", -4);
    });

    it("has own convenience functions", function() {
        test("logn(81, 3)", 4);
        test("rootn(8, 3)", 2);
        test("csc(1)", 1 / Math.sin(1));
        test("sec(1)", 1 / Math.cos(1));
        test("cot(1)", 1 / Math.tan(1));
    });

    it("supports implicit multiplication", function() {
        // Test implicit multiplication
        // ["-2a + - 2 a + (2)(a a) + 2(a) + a(2)", 18, { a: 3 }],
        // ["4a(1+b)", 60, { a: 3, b: 4 }],
        
        test("2a", 6, { a: 3 });
        test("a 2", 6, { a: 3 });
        test("a b", 6, { a: 3, b: 2 });
        test("a sin(0.5PI)", 3, { a: 3 });
        test("2 sin(0.5PI)", 2);
        test("2(a)", 6, { a: 3 });
        test("(2)4", 8);
        test("(2)(4)", 8);
        test("2x^2 + 5x + 7", 18 + 15 + 7, { x: 3 });
        test("-2a + - 2 a + (2)(a a) + 2(a) + a(2)", 18, { a: 3 });
        test("4a(1+b)", 60, { a: 3, b: 4 });
    });

    it("supports paren-less functions", function() {
        test("cos PI^2", Math.cos(Math.PI * Math.PI));
        test("log10 100 + 2", 4);
        test("log10 100 * 2", 4);
        test("log10 100 ^ 2", 4);
    });

    it("support LaTeX's stupid one-number powers", function() {
        test("2^24", 16, {}, { latex: true });
        test("2^{12}", 4096, {}, { latex: true });
    });

    it("supports LaTeX typesetting", function() {
        test("\\frac 4 2", 2, {}, { latex: true });
        test("\\frac 4 2 ^ 3", 8, {}, { latex: true });
        test("\\frac {4 ^ 2} 3", 16/3, {}, { latex: true });
        test("\\frac (4 ^ 2) 3", 16/3, {}, { latex: true });
        test("\\frac{1}{2}x^{-\\frac{1}{2}}", 1/6, { x: 9 }, { latex: true });
    });
});