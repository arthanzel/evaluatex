import { assert } from "chai";
import evaluatex from "../src/evaluatex";

function test(expression, expectedResult, constants = {}, variables = {}, opts = {}) {
    const fn = evaluatex(expression, constants, opts);
    const result = fn(variables);
    try {
        assert.closeTo(fn(variables), expectedResult, 1E-6);
    }
    catch (e) {
        console.log(fn.tokens.toString());
        fn.ast.printTree();
        throw e;
    }
}

describe("Evaluatex", function () {
    it("computes simple formulae", function () {
        test("2", 2);
        test("-5 - -4", -1);
        test("(1 + 2 / 3 * 4 - 5)^2", 16 / 9);
    });

    it("allows constants", function () {
        test("x", 5, { x: 5 });
        test("x^2 + y^2 - 13", 0, { x: 3, y: 2 });
        test("x^y + z", 13, { x: 2, y: 3, z: 5 });
    });

    it("doesn't overwrite constants with variables", function () {
        test("x", 5, { /* constant */ x: 5 }, { /* variable - should be ignored */ x: 6 });
    });

    it("supports Javascript's Math functions and constants", function () {
        test("PI", Math.PI);
        test("sqrt(4)", 2);
        test("hypot(10)", 10);
        test("hypot(3, 4)", 5);
        test("min(5, 4, 3, -2, 1)", -2);
    });

    it("supports absolute values", function () {
        test("|5|", 5);
        test("|-5|", 5);
        test("|--5|", 5);
        test("|5 - 10|^2", 25);
        test("2 * -|2 - 4|", -4);
    });

    it("supports factorials", function () {
        test("4!", 24);
        test("(4 + 1)!", 120);
        test("4 + 1!", 5);
        test("3.9!", 4 * 3 * 2);
        test("3.9! + 3.1!", 30); // Round to nearest integer
    });

    it("supports custom functions", function () {
        test("incr(5)", 6, { incr: a => a + 1 });
        test("add(5, 6)", 11, { add: (a, b) => a + b });
    });

    it("has own convenience functions", function () {
        test("logn(81, 3)", 4);
        test("rootn(8, 3)", 2);
        test("csc(1)", 1 / Math.sin(1));
        test("sec(1)", 1 / Math.cos(1));
        test("cot(1)", 1 / Math.tan(1));
    });

    it("supports implicit multiplication", function () {
        // Test implicit multiplication
        // ["-2a + - 2 a + (2)(a a) + 2(a) + a(2)", 18, { a: 3 }],
        // ["4a(1+b)", 60, { a: 3, b: 4 }],

        // Terms separated by whitespace always multiply.
        // Numbers followed by symbols always multiply.
        test("2a", 6, { a: 3 });
        test("a 2", 6, { a: 3 });
        test("a2", 100, { a: 3, a2: 100 }); // a2 is a symbol and not a * 2
        test("a b", 6, { a: 3, b: 2 });

        // A symbol followed by a term in brackets is a multiplication unless the symbol is a function.
        test("a(2)", 6, { a: 3 });
        test("a(2)", 3, { a: arg => arg + 1 });
        test("a(2)b", 9, { a: arg => arg + 1, b: 3 });

        // Bracketed terms always multiply...
        test("(2)(3)", 6);
        test("2(3)", 6);
        test("(2)3", 6);
        test("a(2+3)", 20, { a: 4 });
        test("2(a + b)", 14, { a: 3, b: 4 });

        // ...unless one is part of a function
        test("a(2)(3)", 24, { a: 4 });
        test("a(2)(3)", 9, { a: arg => arg + 1 });
        test("3a(2)(3)", 27, { a: arg => arg + 1 });

        // Some complicated examples
        test("2x^2 + 5x + 7", 18 + 15 + 7, { x: 3 });
        test("-2a + - 2 a + (2)(a a) + 2(a) + a(2)", 18, { a: 3 });
        test("4a(1+b)", 60, { a: 3, b: 4 });
    });

    it("supports paren-less functions", function () {
        const PI = Math.PI;

        // In ASCII mode, functions can take a single argument without parens.
        // Single powers, absolute value, negatives, etc. are all part of the argument.
        // Any additions or multiplications are not.
        test("cos PI", -1);
        test("cos PI + PI", -1 + PI);
        test("cos PI * PI", -1 * PI);
        test("cos PI^PI", Math.cos(Math.pow(PI, PI)));
        test("cos 3PI", Math.cos(3) * PI);

        // Same thing with logs
        test("log10 100 + 2", 4); // log10(100) + 2
        test("log10 100 * 2", 4); // log10(100) * 2
        test("log10 100 ^ 2", 4); // log10(100^2)
    });

    it("supports parens", function () {
        test("{1 + [2 - {3 + 4}]}", -4);
        test("{1 + \\left[2 - \\left(3 + 4\\right)\\right]}", -4);
    });

    it("support LaTeX's stupid one-number expressions", function () {
        test("2^24", 16, {}, {}, { latex: true });
        test("2^{12}", 4096, {}, {}, { latex: true });
        test("\\frac 4 2", 2, {}, {}, { latex: true });
        test("\\frac 4 2 ^ 3", 8, {}, {}, { latex: true });
        test("\\frac {4 ^ 2} 3", 16 / 3, {}, {}, { latex: true });
        test("\\frac {(4 ^ 2)} {3}", 16 / 3, {}, {}, { latex: true });
        test("\\frac {4 ^ 2} 32", 32 / 3, {}, {}, { latex: true });
    });

    it("supports LaTeX typesetting", function () {
        test("\\frac{1}{2}x^{-\\frac{1}{2}}", 1 / 6, { x: 9 }, {}, { latex: true });
        test("\\sqrt 45", 10, {}, {}, { latex: true });
    });
});