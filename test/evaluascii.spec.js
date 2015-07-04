var assert = require("chai").assert;
require("./helpers/aboutEqual");

var Evaluatex = require("../evaluascii.js");

var formulae = [
    ["2", 2],
    ["2 * x", 4, { x: 2 }],
    ["2 * 4 + 1 / 4 - 3 / -2^2 * -cos(PI)", 9],
    ["sin(PI / 2)", 1],
    ["sqrt(LN2 + x)", Math.sqrt(Math.LN2 + 5), { x: 5 }]
];

describe("Evaluascii.js", function() {
    it("Calculates some formulae", function() {
        for (i in formulae) {
            var formula = formulae[i];
            var expression = formula[0];
            var result = formula[1];
            var locals = formula[2] || {};

            //console.log(expression); // For debugging

            assert.aboutEqual(Evaluatex.evaluate(expression, locals), result);
        }
    });
});