module.exports = function interpolate(str) {
    var newString = "";
    var counter = 1;

    for (var i = 0; i < str.length; i++) {
        var current = str.charAt(i);
        var prev = str.charAt(i - 1) || "";
        var next = str.charAt(i + 1) || "";

        if (current == "%" && prev != "\\") {
            newString += arguments[counter];
            counter++;
        }
        else if (current == "\\" && next == "%") {

        }
        else {
            newString += current;
        }
    }

    return newString;
};