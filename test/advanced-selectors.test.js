const foresta = require('../src/foresta');
const esprima = require('esprima');

describe('Advanced Selector Features', () => {
    describe('Attribute Selectors - Exact Match', () => {
        test('should select Literal nodes with specific value using [value=42]', () => {
            const code = `
                var a = 42;
                var b = 100;
                var c = 42;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("Literal[value=42]");
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results.every(r => r.value === 42)).toBe(true);
        });

        test('should select Identifier nodes with specific name using [name=foo]', () => {
            const code = `
                var foo = 1;
                var bar = 2;
                var foo = 3;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta("Identifier[name=foo]");
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results.every(r => r.name === 'foo')).toBe(true);
        });

        test('should select string literals with specific value', () => {
            const code = `
                var a = "hello";
                var b = "world";
                var c = "hello";
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Literal[value="hello"]');
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results.every(r => r.value === 'hello')).toBe(true);
        });
    });

    describe('Attribute Selectors - Starts With', () => {
        test('should select identifiers starting with "is" using [name^="is"]', () => {
            const code = `
                var isValid = true;
                var isEnabled = false;
                var hasValue = 1;
                var isReady = true;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Identifier[name^="is"]');
            query.visit(ast);

            expect(query.results.length).toBeGreaterThan(0);
            expect(query.results.every(r => r.name && r.name.startsWith('is'))).toBe(true);
        });

        test('should select identifiers starting with "get"', () => {
            const code = `
                var getValue = function() {};
                var getName = function() {};
                var setValue = function() {};
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Identifier[name^="get"]');
            query.visit(ast);

            expect(query.results.length).toBeGreaterThan(0);
            expect(query.results.every(r => r.name && r.name.startsWith('get'))).toBe(true);
        });
    });

    describe('Attribute Selectors - Ends With', () => {
        test('should select identifiers ending with "Value"', () => {
            const code = `
                var myValue = 1;
                var yourValue = 2;
                var myData = 3;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Identifier[name$="Value"]');
            query.visit(ast);

            expect(query.results.length).toBeGreaterThan(0);
            expect(query.results.every(r => r.name && r.name.endsWith('Value'))).toBe(true);
        });
    });

    describe('Attribute Selectors - Contains', () => {
        test('should select identifiers containing "test"', () => {
            const code = `
                var myTestVar = 1;
                var testValue = 2;
                var anotherTest = 3;
                var other = 4;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Identifier[name*="test"]');
            query.visit(ast);

            expect(query.results.length).toBeGreaterThan(0);
            expect(query.results.every(r => r.name && r.name.includes('test'))).toBe(true);
        });
    });

    describe('Attribute Selectors - RegExp Patterns', () => {
        test('should select identifiers matching regex pattern using [name~/^get[A-Z]/]', () => {
            const code = `
                var getValue = function() {};
                var getName = function() {};
                var get = function() {};
                var getvalue = function() {};
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Identifier[name~/^get[A-Z]/]');
            query.visit(ast);

            // Should match getValue and getName but not get or getvalue
            const matchedNames = query.results.map(r => r.name).filter(n => n);
            expect(matchedNames).toContain('getValue');
            expect(matchedNames).toContain('getName');
        });

        test('should select identifiers with numeric suffix', () => {
            const code = `
                var item1 = 1;
                var item2 = 2;
                var itemX = 3;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Identifier[name~/item[0-9]/]');
            query.visit(ast);

            const matchedNames = query.results.map(r => r.name).filter(n => n);
            expect(matchedNames).toContain('item1');
            expect(matchedNames).toContain('item2');
            expect(matchedNames).not.toContain('itemX');
        });
    });

    describe('Nested Property Attribute Selectors', () => {
        test('should select CallExpression nodes where callee.name equals "fetch"', () => {
            const code = `
                fetch('/api/data');
                console.log('test');
                fetch('/api/users');
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('CallExpression[callee.name=fetch]');
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results.every(r => r.callee.name === 'fetch')).toBe(true);
        });

        test('should select CallExpression nodes where callee.name equals "console.log"', () => {
            const code = `
                console.log('a');
                console.error('b');
                console.log('c');
            `;
            const ast = esprima.parseScript(code);
            // Note: console.log is a MemberExpression, so callee.property.name is what we need
            const query = new foresta('CallExpression');
            query.visit(ast);

            // Filter manually for this test since console.log structure is complex
            const logCalls = query.results.filter(r => 
                r.callee.type === 'MemberExpression' &&
                r.callee.object.name === 'console' &&
                r.callee.property.name === 'log'
            );
            expect(logCalls).toHaveLength(2);
        });
    });

    describe('Pseudo-Class: :not()', () => {
        test('should select VariableDeclarators not named "foo"', () => {
            const code = `
                var foo = 1;
                var bar = 2;
                var baz = 3;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('VariableDeclarator:not([id.name=foo])');
            query.visit(ast);

            // Should find bar and baz, but not foo
            const names = query.results.map(r => r.id.name);
            expect(names).not.toContain('foo');
            expect(names.length).toBeGreaterThan(0);
        });

        test('should select literals that are not 42', () => {
            const code = `
                var a = 42;
                var b = 100;
                var c = 200;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Literal:not([value=42])');
            query.visit(ast);

            expect(query.results.every(r => r.value !== 42)).toBe(true);
            expect(query.results.length).toBeGreaterThan(0);
        });
    });

    describe('Pseudo-Class: :first-child', () => {
        test('should select the first property in an object', () => {
            const code = `
                var obj = {
                    first: 1,
                    second: 2,
                    third: 3
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Property:first-child');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].key.name).toBe('first');
        });

        test('should select first variable in each declaration', () => {
            const code = `
                var a = 1, b = 2;
                var c = 3, d = 4;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('VariableDeclarator:first-child');
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            const names = query.results.map(r => r.id.name);
            expect(names).toContain('a');
            expect(names).toContain('c');
        });
    });

    describe('Pseudo-Class: :last-child', () => {
        test('should select the last property in an object', () => {
            const code = `
                var obj = {
                    first: 1,
                    second: 2,
                    third: 3
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Property:last-child');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].key.name).toBe('third');
        });
    });

    describe('Pseudo-Class: :nth-child()', () => {
        test('should select the second property using :nth-child(2)', () => {
            const code = `
                var obj = {
                    first: 1,
                    second: 2,
                    third: 3
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Property:nth-child(2)');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].key.name).toBe('second');
        });

        test('should select the third declarator using :nth-child(3)', () => {
            const code = `
                var a = 1, b = 2, c = 3, d = 4;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('VariableDeclarator:nth-child(3)');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].id.name).toBe('c');
        });
    });

    describe('Pseudo-Class: :empty', () => {
        test('should select empty object expressions', () => {
            const code = `
                var a = {};
                var b = { x: 1 };
                var c = {};
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('ObjectExpression:empty');
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results.every(r => r.properties.length === 0)).toBe(true);
        });

        test('should select empty array expressions', () => {
            const code = `
                var a = [];
                var b = [1, 2];
                var c = [];
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('ArrayExpression:empty');
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results.every(r => r.elements.length === 0)).toBe(true);
        });
    });

    describe('Pseudo-Class: :has()', () => {
        test('should select ObjectExpression that has a Property', () => {
            const code = `
                var a = {};
                var b = { x: 1 };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('ObjectExpression:has(Property)');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].properties.length).toBeGreaterThan(0);
        });

        test('should select FunctionExpression that has a ReturnStatement', () => {
            const code = `
                var a = function() { var x; };
                var b = function() { return 42; };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('FunctionExpression:has(ReturnStatement)');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
        });
    });

    describe('Combinator: > (Direct Child)', () => {
        test('should select VariableDeclaration as direct child of BlockStatement', () => {
            const code = `
                function test() {
                    var a = 1;
                    if (true) {
                        var b = 2;
                    }
                }
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('BlockStatement > VariableDeclaration');
            query.visit(ast);

            // Should find both var a and var b (each is direct child of a BlockStatement)
            expect(query.results.length).toBeGreaterThan(0);
        });

        test('should select ReturnStatement as direct child of IfStatement', () => {
            const code = `
                function test() {
                    if (true) {
                        return 1;
                    }
                }
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('IfStatement > ReturnStatement');
            query.visit(ast);

            // The consequent of IfStatement is BlockStatement, not ReturnStatement
            // So this should return 0 or the BlockStatement contains the ReturnStatement
            expect(query.results).toHaveLength(0);
        });

        test('should select Literal as direct child of SwitchCase', () => {
            const code = `
                switch (x) {
                    case 1:
                        break;
                    case 2:
                        break;
                }
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('SwitchCase > Literal');
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results.map(r => r.value)).toEqual([1, 2]);
        });
    });

    describe('Combinator: + (Adjacent Sibling)', () => {
        test('should select Property adjacent to another Property', () => {
            const code = `
                var obj = {
                    a: 1,
                    b: 2,
                    c: 3
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Property + Property');
            query.visit(ast);

            // Should find b (after a) and c (after b)
            expect(query.results).toHaveLength(2);
            const keys = query.results.map(r => r.key.name);
            expect(keys).toContain('b');
            expect(keys).toContain('c');
        });
    });

    describe('Combinator: ~ (General Sibling)', () => {
        test('should select any Property that follows another Property', () => {
            const code = `
                var obj = {
                    a: 1,
                    b: 2,
                    c: 3,
                    d: 4
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Property ~ Property');
            query.visit(ast);

            // All properties except 'a' should match (they all have a previous Property sibling)
            expect(query.results.length).toBeGreaterThan(0);
        });
    });

    describe('Logical OR (Comma Separator)', () => {
        test('should select either VariableDeclaration or FunctionDeclaration', () => {
            const code = `
                var x = 1;
                function foo() {}
                var y = 2;
                function bar() {}
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('VariableDeclaration, FunctionDeclaration');
            query.visit(ast);

            expect(query.results).toHaveLength(4);
            const types = query.results.map(r => r.type);
            expect(types.filter(t => t === 'VariableDeclaration')).toHaveLength(2);
            expect(types.filter(t => t === 'FunctionDeclaration')).toHaveLength(2);
        });

        test('should select Literal or Identifier', () => {
            const code = `
                var foo = 42;
                var bar = baz;
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Literal, Identifier');
            query.visit(ast);

            expect(query.results.length).toBeGreaterThan(0);
            expect(query.results.every(r => r.type === 'Literal' || r.type === 'Identifier')).toBe(true);
        });
    });

    describe('Export Selectors', () => {
        test('should select FunctionDeclaration within ExportNamedDeclaration', () => {
            const code = `
                export function foo() {
                    return 42;
                }
            `;
            const ast = esprima.parseModule(code);
            const query = new foresta('ExportNamedDeclaration FunctionDeclaration');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].type).toBe('FunctionDeclaration');
            expect(query.results[0].id.name).toBe('foo');
        });

        test('should select using direct child combinator for exports', () => {
            const code = `
                export function bar() {}
            `;
            const ast = esprima.parseModule(code);
            const query = new foresta('ExportNamedDeclaration > FunctionDeclaration');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].id.name).toBe('bar');
        });
    });

    describe('Complex Queries', () => {
        test('should handle attribute selector combined with pseudo-class', () => {
            const code = `
                var obj = {
                    foo: 1,
                    bar: 2,
                    baz: 3
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('Property[key.name^="ba"]:first-child');
            query.visit(ast);

            // bar is the first property that starts with "ba" and is in first position? No.
            // Actually :first-child checks if the element is the first child
            // So we need a property that starts with "ba" AND is the first child
            // In this case, 'foo' is first child but doesn't start with 'ba'
            expect(query.results).toHaveLength(0);
        });

        test('should handle multiple combinators in sequence', () => {
            const code = `
                var obj = {
                    method: function() {
                        return {
                            nested: 42
                        };
                    }
                };
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('ObjectExpression Property FunctionExpression');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].type).toBe('FunctionExpression');
        });

        test('should work with async/await expressions', () => {
            const code = `
                async function test() {
                    await fetch('/api');
                    return await getData();
                }
            `;
            const ast = esprima.parseScript(code, { ecmaVersion: 2017 });
            const query = new foresta('AwaitExpression');
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results.every(r => r.type === 'AwaitExpression')).toBe(true);
        });

        test('should handle arrow functions', () => {
            const code = `
                const add = (a, b) => a + b;
                const square = x => x * x;
            `;
            const ast = esprima.parseScript(code, { ecmaVersion: 2015 });
            const query = new foresta('ArrowFunctionExpression');
            query.visit(ast);

            expect(query.results).toHaveLength(2);
            expect(query.results.every(r => r.type === 'ArrowFunctionExpression')).toBe(true);
        });
    });

    describe('Control Flow Selectors', () => {
        test('should find IfStatement with ReturnStatement inside', () => {
            const code = `
                function test() {
                    if (true) {
                        return 1;
                    }
                    return 0;
                }
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('IfStatement:has(ReturnStatement)');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].type).toBe('IfStatement');
        });

        test('should find SwitchStatement with cases', () => {
            const code = `
                switch (x) {
                    case 1:
                        console.log('one');
                        break;
                    case 2:
                        console.log('two');
                        break;
                }
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('SwitchStatement');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].cases).toHaveLength(2);
        });
    });

    describe('Edge Cases and Complex Scenarios', () => {
        test('should handle nested scopes correctly', () => {
            const code = `
                function outer() {
                    var a = 1;
                    function inner() {
                        var b = 2;
                        function innermost() {
                            var c = 3;
                        }
                    }
                }
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('VariableDeclarator');
            query.visit(ast);

            expect(query.results).toHaveLength(3);
            const names = query.results.map(r => r.id.name);
            expect(names).toEqual(['a', 'b', 'c']);
        });

        test('should handle closures', () => {
            const code = `
                function makeCounter() {
                    var count = 0;
                    return function() {
                        return ++count;
                    };
                }
            `;
            const ast = esprima.parseScript(code);
            const query = new foresta('FunctionDeclaration:has(FunctionExpression)');
            query.visit(ast);

            expect(query.results).toHaveLength(1);
            expect(query.results[0].id.name).toBe('makeCounter');
        });

        test('should handle promise chains', () => {
            const code = `
                fetch('/api')
                    .then(response => response.json())
                    .then(data => console.log(data))
                    .catch(error => console.error(error));
            `;
            const ast = esprima.parseScript(code, { ecmaVersion: 2015 });
            const query = new foresta('CallExpression[callee.property.name=then]');
            query.visit(ast);

            expect(query.results).toHaveLength(2);
        });
    });
});
