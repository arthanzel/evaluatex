// Nodes that are allowed to have only one child. Nodes that have one child and are not in this list will be simplified during parsing.
let UNARY_NODES = ["FACTORIAL", "FUNCTION", "INVERSE", "NEGATE"];

/**
 * Node represents a node in an abstract syntax tree. Nodes have the following properties:
 *  - A type, which determines how it is evaluated;
 *  - A value, such as a number or function; and
 *  - An ordered list of children.
 */
export default class Node {
    constructor(type, value = "") {
        this.type = type;
        this.value = value;
        this.children = [];
    }

    /**
     * Adds a node to the list of children and returns this Node.
     * @param node Child node to addChild.
     * @returns {Node} This node.
     */
    addChild(node) {
        this.children.push(node);
        return this;
    }

    /**
     * Returns this Node's first child.
     */
    get child() {
        return this.children[0];
    }

    /**
     * Evaluates this Node and all child nodes recursively, returning the numerical result of this Node.
     */
    evaluate(locals) {
        let result = 0;

        switch (this.type) {
            case "FUNCTION":
                let evaluatedChildren = [];
                for (let i in this.children) {
                    evaluatedChildren.push(this.children[i].evaluate(locals));
                }
                result = this.value.apply(this, evaluatedChildren);
                break;
            case "INVERSE":
                result = 1.0 / this.child.evaluate(locals);
                break;
            case "NEGATE":
                result = -this.child.evaluate(locals);
                break;
            case "NUMBER":
                result = this.value;
                break;
            case "POWER":
                result = Math.pow(
                    this.children[0].evaluate(locals),
                    this.children[1].evaluate(locals)
                );
                break;
            case "PRODUCT":
                let product = 1;
                for (let i in this.children) {
                    product *= this.children[i].evaluate(locals);
                }
                result = product;
                break;
            case "SUM":
                let sum = 0;
                for (let i in this.children) {
                    sum += this.children[i].evaluate(locals);
                }
                result = sum;
                break;
            case "SYMBOL":
                if (isFinite(locals[this.value])) {
                    return locals[this.value];
                }
                throw "Symbol " + this.value + " is undefined or not a number";
        }

        return result;
    }

    /**
     * Determines whether this Node is unary, i.e., whether it can have only one child.
     * @returns {boolean}
     */
    isUnary() {
        return UNARY_NODES.indexOf(this.type) >= 0;
    }

    get nodeCount() {
        let count = 1;
        for (let i of this.children) {
            count += i.nodeCount;
        }
        return count;
    }

    /**
     * Prints a tree-like representation of this Node and all child Nodes to the console.
     * Useful for debugging parser problems.
     * If printTree() is called on the root node, it prints the whole AST!
     * @param level (Integer, Optional) Initial level of indentation. You shouldn't need to use this.
     */
    printTree(level = 0) {
        // Generate the indent string from the current `level`.
        // Child nodes will have a greater `level` and will appear indented.
        let indent = "";
        let indentString = "  ";
        for (let i = 0; i < level; i++) {
            indent += indentString;
        }

        console.log(indent + this.toString());

        // Print each child.
        for (let i in this.children) {
            this.children[i].printTree(level + 1);
        }
    }

    simplify() {
        if (this.children.length > 1 || this.isUnary()) {
            // Node can't be simplified.
            // Clone this Node and simplify its children.
            let newNode = new Node(this.type, this.value);
            for (let i in this.children) {
                newNode.addChild(this.children[i].simplify());
            }
            return newNode;
        }
        else if (this.children.length === 1) {
            // A non-unary node with no children has no function.
            return this.children[0].simplify();
        }
        else {
            // A node with no children is a terminal.
            return this;
        }
    }

    toString() {
        let val = typeof this.value === "function" ? this.value.name : this.value;
        return `${ this.children.length } ${ this.type } [${ val }]`;
    }
}

/*
// Simplifies this Node and all children recursively, returning a new
// node tree.
Node.prototype.simplify = function() {

};
*/