const path = require("path");

module.exports = {
    mode: "production",
    entry: "./dist/minifier.js",
    output: {
        path: path.resolve("./dist"),
        filename: "evaluatex.min.js"
    }
}