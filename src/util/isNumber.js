/**
 * Returns true if the argument if a finite numeric value.
 */
export default function isNumber(a) {
    return a !== null && isFinite(a);
}