const foresta = require('../src/foresta');
const esprima = require('esprima');

describe('Foresta Selector Engine', () => {
    describe('Basic functionality', () => {
        test('should create a foresta instance with query', () => {
            const query = new foresta("Literal");
            expect(query.query).toBe("Literal");
            expect(query.filters).toBeDefined();
            expect(query.results).toBeDefined();
            expect(Array.isArray(query.results)).toBe(true);
        });

        test('should parse and visit AST without errors', () => {
            const code = 'var x = 42;';
            const ast = esprima.parseScript(code);
            const query = new foresta("Literal");
            
            expect(() => {
                query.visit(ast);
            }).not.toThrow();
        });
    });

    describe('Literal selector', () => {
        test('should select all literal values using "Literal" query', () => {
            const code = `
                var a = 42;
                var b = "hello";
                var c = true;
                var d = null;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("Literal");
            query.visit(ast);

            expect(query.results).toHaveLength(4);
            expect(query.results[0].value).toBe(42);
            expect(query.results[1].value).toBe("hello");
            expect(query.results[2].value).toBe(true);
            expect(query.results[3].value).toBe(null);
        });
    });

    describe('Identifier selector', () => {
        test('should select specific variable by name using "#theValue" query', () => {
            const code = `
                var theValue = 4 + 2;
                var otherValue = 10;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("#theValue");
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].type).toBe("Identifier");
            expect(query.results[0].name).toBe("theValue");
            
            // The identifier itself doesn't have init, but its parent VariableDeclarator does
            expect(query.results[0].parent).toBeDefined();
            expect(query.results[0].parent.type).toBe("VariableDeclarator");
            expect(query.results[0].parent.init.type).toBe("BinaryExpression");
        });

        test('should not match identifiers with different names', () => {
            const code = `
                var someOtherVar = 123;
                var anotherVar = 456;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("#theValue");
            query.visit(ast);

            expect(query.results).toHaveLength(0);
        });
    });

    describe('Global variables selector', () => {
        test('should select all global variables using "Program VariableDeclaration VariableDeclarator"', () => {
            const code = `
                var globalVar1 = 1;
                var globalVar2 = 2;
                function test() {
                    var localVar = 3;
                }
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("Program VariableDeclaration VariableDeclarator");
            query.visit(ast);

            // Should only find the 2 global variables, not the local one
            expect(query.results).toHaveLength(2);
            expect(query.results[0].id.name).toBe("globalVar1");
            expect(query.results[1].id.name).toBe("globalVar2");
        });
    });

    describe('Property modifiers', () => {
        test('should use contextual property modifiers to select function expression', () => {
            const code = `
                var a = {
                    update: function() {
                        var s;
                    }
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("ObjectExpression Property #update:parent:value");
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].type).toBe("FunctionExpression");
        });

        test('should handle multiple property modifiers', () => {
            const code = `
                var obj = {
                    method: function() {
                        return 42;
                    }
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("#method:parent");
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].type).toBe("Property");
        });
    });

    describe('Wildcard selector', () => {
        test('should match any expression type using "*" wildcard', () => {
            const code = `var x = 42;`;
            const ast = esprima.parseScript(code);
            const query = new foresta("*");
            query.visit(ast);

            // Should match all nodes in the AST
            expect(query.results.length).toBeGreaterThan(0);
        });
    });

    describe('Expression type selectors', () => {
        test('should select binary expressions', () => {
            const code = `
                var a = 1 + 2;
                var b = 3 * 4;
                var c = 5;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("BinaryExpression");
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results[0].operator).toBe("+");
            expect(query.results[1].operator).toBe("*");
        });

        test('should select function expressions', () => {
            const code = `
                var fn1 = function() { return 1; };
                var fn2 = function(x) { return x * 2; };
                var notAFunction = 42;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("FunctionExpression");
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results[0].type).toBe("FunctionExpression");
            expect(query.results[1].type).toBe("FunctionExpression");
        });

        test('should select object expressions', () => {
            const code = `
                var obj1 = { a: 1 };
                var obj2 = { b: 2, c: 3 };
                var notAnObject = 42;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("ObjectExpression");
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results[0].type).toBe("ObjectExpression");
            expect(query.results[1].type).toBe("ObjectExpression");
        });
    });

    describe('Complex queries', () => {
        test('should handle multi-part queries', () => {
            const code = `
                var config = {
                    handlers: {
                        onClick: function() {
                            console.log("clicked");
                        }
                    }
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("ObjectExpression Property");
            query.visit(ast);

            // Should find properties in both nested objects
            expect(query.results.length).toBeGreaterThan(0);
            expect(query.results.every(result => result.type === "Property")).toBe(true);
        });
    });

    describe('Edge cases', () => {
        test('should handle empty query gracefully', () => {
            const code = `var x = 42;`;
            const ast = esprima.parseScript(code);
            const query = new foresta("");
            query.visit(ast);

            expect(query.results).toHaveLength(0);
        });

        test('should handle query with spaces', () => {
            const code = `var x = 42;`;
            const ast = esprima.parseScript(code);
            const query = new foresta("  Literal  ");
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].value).toBe(42);
        });

        test('should handle non-existent selector', () => {
            const code = `var x = 42;`;
            const ast = esprima.parseScript(code);
            const query = new foresta("NonExistentType");
            query.visit(ast);

            expect(query.results).toHaveLength(0);
        });

        test('should handle null and undefined values in AST', () => {
            const code = `function test() {}`;
            const ast = esprima.parseScript(code);
            const query = new foresta("FunctionExpression");
            
            expect(() => {
                query.visit(ast);
            }).not.toThrow();
        });
    });
});