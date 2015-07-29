var interpolate = require("./utils/interpolate");
var isNumber = require("./utils/isNumber");

var UNARY_NODES = ["FACTORIAL", "FUNCTION", "INVERSE", "NEGATE"];

var Node = module.exports = function Node(type, value) {
    if (value === undefined) value = "";

    this.type = type;
    this.value = value;
    this.children = [];
};

Node.prototype.add = function(node) {
    this.children.push(node); return this;
};

Node.prototype.evaluate = function(locals) {
    switch (this.type) {
        case "FACTORIAL":
            result = 1;
            var i = Math.round(this.children[0].evaluate(locals));

            // Factorials for numbers < 0 are not defined.
            if (i < 0) {
                throw "Can't take the factorial of a negative number!";
            }

            // Compute the factorial.
            for (i; i > 0; i--) {
                result *= i;
            }
            return result;
        case "FUNCTION":
            var evaluatedChildren = [];
            for (i in this.children) {
                evaluatedChildren.push(this.children[i].evaluate(locals));
            }
            return this.value.apply(this, evaluatedChildren);
        case "INVERSE":
            return 1.0 / this.children[0].evaluate(locals);
        case "NEGATE":
            return -this.children[0].evaluate(locals);
        case "NUMBER":
            return this.value;
        case "POWER":
            return Math.pow(
                this.children[0].evaluate(locals),
                this.children[1].evaluate(locals)
            );
        case "PRODUCT":
            var result = 1;
            for (i in this.children) {
                result *= this.children[i].evaluate(locals);
            }
            return result;
        case "SUM":
            var result = 0;
            for (i in this.children) {
                result += this.children[i].evaluate(locals);
            }
            return result;
        case "SYMBOL":
            if (isNumber(locals[this.value])) {
                return locals[this.value];
            }
            throw "Symbol " + this.value +
                  " is undefined or not a number";
    }
};

Node.prototype.isUnary = function isUnary() {
    return UNARY_NODES.indexOf(this.type) >= 0;
};

// Prints a tree-like representation of this Node and its children to the console.
// Useful for debugging parser problems.
// If `printTree` is called on the root node, it prints the whole AST!
Node.prototype.printTree = function(level) {
    level = level || 0;

    // Generate the indent string from the current `level`.
    // Child nodes will have a greater `level` and will appear indented.
    var indent = "";
    var iString = "  ";
    for (var i = 0; i < level; i++) {
        indent += iString;
    };

    // Format: `TYPE value (children)`
    // OR
    // `TYPE (children)`.
    if (this.value) {
        console.log(interpolate("%% % (%)",
            indent,
            this.type,
            this.value.name || this.value,
            this.children.length));
    }
    else {
        console.log(interpolate("%% (%)",
            indent,
            this.type,
            this.children.length));
    }

    // Print each child.
    for (var i in this.children) {
        this.children[i].printTree(level + 1);
    }
};

// Simplifies this Node and all children recursively, returning a new
// node tree.
// Simplification removes all Nodes with one child, unless the node's `unary` flag is set.
Node.prototype.simplify = function() {
    if (this.children.length > 1 || this.isUnary()) {
        var newNode = new Node(this.type, this.value);
        for (i in this.children) {
            newNode.add(this.children[i].simplify());
        }
        return newNode;
    }
    else if (this.children.length == 1) {
        return this.children[0].simplify();
    }
    else { // No children
        return this;
    }
};
