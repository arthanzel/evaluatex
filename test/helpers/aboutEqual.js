var chai = require("chai");
var assert = chai.assert;
var expect = chai.expect;
chai.should();

/**
 * aboutEqual.js
 *
 * This file adds an aboutEqual assertion to compare floating-point numbers.
 */

chai.use(function(_chai, utils) {
    _chai.Assertion.addMethod("aboutEqual", function(other, precision) {
        var safety = 0.000000001;

        // Set precision to 0 if it is missing.
        // In this case, the assertion will check if numbers are supposed to be equal.
        precision = precision || 0;

        // Adding `safety` is necessary to avoid bugs like 3.6 - 3.5 > 0.1.
        // The safety should be small enough not to make a difference, but large enough
        // to catch these cases with floating-point rounding.
        this.assert(
            Math.abs(this._obj - other) <= precision + safety,
            "expected #{this} to be equal to #{exp} plus or minus " + precision,
            "expected #{this} not to be equal to #{exp} plus or minus " + precision,
            other
        );
    });

    _chai.assert.aboutEqual = function(a, b, p) { a.should.be.aboutEqual(b, p); };
});

// ====== Assertion test ======

describe("The aboutEqual assertion", function() {
    it("works for numbers", function() {
        chai.assert.aboutEqual(3.5, 3.6, 0.1);
        chai.expect(3.5).to.be.aboutEqual(3.6, 0.2);
        (3.5).should.aboutEqual(3.6, 0.1);
    });
});