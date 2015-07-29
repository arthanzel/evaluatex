// Helper method to check whether a value exists and is, in fact, a number.
module.exports = function isNumber(a) {
    return a !== null && isFinite(a);
}