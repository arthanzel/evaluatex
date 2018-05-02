// Map of convenient functions missing from Javascript's Math API. These will be mixed in to the local variables when expressions are being evaluated.
module.exports = {
    frac: function frac(a, b) {
        return a / b;
    },
    logn: function logn(x, n) {
        return Math.log(x) / Math.log(n);
    },
    rootn: function rootn(x, n) {
        return Math.pow(x, 1/n);
    },
    sec: function src(x) {
        return 1 / Math.cos(x);
    },
    csc: function csc(x) {
        return 1 / Math.sin(x);
    },
    cot: function cot(x) {
        return 1 / Math.tan(x);
    }
};