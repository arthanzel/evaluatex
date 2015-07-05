var assert = require("chai").assert;
require("./helpers/aboutEqual");

var Evaluascii = require("../evaluascii.js");

var formulae = [
    ["2", 2],
    ["3 * x", 12, { x: 4 }],
    ["- 2 ^ 4", -16],
    ["2 * 4 + 1 / 4 - 3 / -2^2 * -cos(PI)", 9],
    ["sin(PI / 2)", 1],
    ["sqrt(LN2 + x)", Math.sqrt(Math.LN2 + 5), { x: 5 }],
    ["hypot 10", 10],
    ["hypot 10^2", 100],
    ["hypot 10 * 2", 20],
    ["hypot(3, 4)", 5],
    ["(-b + sqrt(b^2 - 4 * a * c)) / (2 * a)", 3, { a: 2, b : -4, c: -6 }],
    ["(-b + sqrt(b^2 - 4a * c)) / (2 a)", 3, { a: 2, b : -4, c: -6 }],

    // Test implicit multiplication
    ["-2a + - 2 a + (2)(a a)", 6, { a: 3 }],

    // Test absolute value
    ["2 + -|6 - 2^4| * 9", -88],

    // Test custom functions
    ["incr 2 + incr(3)", 7, { incr: function(a) { return a + 1; } }],

    // Test factorial -40320
    ["-(2^3)!", -40320],
    ["4.5!", 5*4*3*2],

    // Test parens
    ["{1 + [2 - {3 + 4}])", -4]
];

describe("Evaluascii.js", function() {
    it("Calculates some formulae", function() {
        for (i in formulae) {
            var formula = formulae[i];
            var expression = formula[0];
            var result = formula[1];
            var locals = formula[2] || {};

            // console.log(expression); // For debugging

            assert.aboutEqual(Evaluascii.evaluate(expression, locals), result);
        }
    });
});