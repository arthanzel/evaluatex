module.exports = function isNumber(a) {
    return a !== null && isFinite(a);
}