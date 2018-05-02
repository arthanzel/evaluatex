'use strict';

let entry;
try {
    entry = require('./dist/evaluatex').default;
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        require('babel-register');
        entry = require('./src/evaluatex').default;
    } else {
        console.log(err);
        process.exit(1);
    }
}

module.exports = entry;