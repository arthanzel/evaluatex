// Map of convenient functions missing from Javascript's Math API. These will be mixed in to the local variables when expressions are being evaluated.
module.exports = {
    frac: function(a, b) {
        return a / b;
    },
    logn: function(x, n) {
        return Math.log(x) / Math.log(n);
    },
    rootn: function(x, n) {
        return Math.pow(x, 1/n);
    },
    sec: function(x) {
        return 1 / Math.cos(x);
    },
    csc: function(x) {
        return 1 / Math.sin(x);
    },
    cot: function(x) {
        return 1 / Math.tan(x);
    }
};