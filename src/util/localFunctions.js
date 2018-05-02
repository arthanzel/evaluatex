/*
Javascript's Math API omits some important mathematical functions. These are included here.
 */

export const fact = function fact(a) {
    a = Math.round(a);
    let result = 1;

    if (a < 0) {
        throw "Can't factorial a negative.";
    }

    for (a; a > 1; a--) {
        result *= a;
    }
    return result;
};

export const frac = function frac(a, b) {
    return a / b;
};

export const logn = function logn(x, b) {
    return Math.log(x) / Math.log(b);
};

export const rootn = function rootn(x, n) {
    return Math.pow(x, 1 / n);
};

export const sec = function src(x) {
    return 1 / Math.cos(x);
};

export const csc = function csc(x) {
    return 1 / Math.sin(x);
};

export const cot = function cot(x) {
    return 1 / Math.tan(x);
};

const locals = { fact, frac, logn, rootn, sec, csc, cot };

// Copy things from Math. Can't use Object.assign since Math has non-enumerable properties.
for (const k of Object.getOwnPropertyNames(Math)) {
    locals[k] = Math[k];
}

export default locals;
