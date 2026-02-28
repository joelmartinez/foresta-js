const foresta = require('../src/foresta');

describe('Foresta API', () => {
    describe('foresta.parse()', () => {
        test('should parse JavaScript code and return an AST', () => {
            const code = 'var x = 42;';
            const ast = foresta.parse(code);
            
            expect(ast).toBeDefined();
            expect(ast.type).toBe('Program');
            expect(ast.body).toBeDefined();
            expect(Array.isArray(ast.body)).toBe(true);
            expect(ast.body.length).toBeGreaterThan(0);
        });

        test('should parse module code when sourceType is module', () => {
            const code = 'export const x = 42;';
            const ast = foresta.parse(code, { sourceType: 'module' });
            
            expect(ast).toBeDefined();
            expect(ast.type).toBe('Program');
            expect(ast.sourceType).toBe('module');
        });

        test('should parse complex code without errors', () => {
            const code = `
                function test() {
                    var x = 1;
                    return x + 2;
                }
                
                var obj = {
                    method: function() {
                        return "hello";
                    }
                };
            `;
            const ast = foresta.parse(code);
            
            expect(ast).toBeDefined();
            expect(ast.type).toBe('Program');
            expect(ast.body.length).toBe(2);
        });
    });

    describe('foresta.query()', () => {
        test('should parse and query code in one call', () => {
            const code = 'var x = 42; var y = 100;';
            const results = foresta.query(code, 'Literal');
            
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(2);
            expect(results[0].value).toBe(42);
            expect(results[1].value).toBe(100);
        });

        test('should work with identifier selectors', () => {
            const code = 'var myVar = 1; var other = 2;';
            const results = foresta.query(code, '#myVar');
            
            expect(results.length).toBe(1);
            expect(results[0].name).toBe('myVar');
        });

        test('should work with attribute selectors', () => {
            const code = 'var x = 42; var y = 100; var z = 42;';
            const results = foresta.query(code, 'Literal[value=42]');
            
            expect(results.length).toBe(2);
            expect(results.every(r => r.value === 42)).toBe(true);
        });

        test('should work with pseudo-classes', () => {
            const code = 'var obj = { a: 1, b: 2, c: 3 };';
            const results = foresta.query(code, 'Property:first-child');
            
            expect(results.length).toBe(1);
            expect(results[0].key.name).toBe('a');
        });

        test('should work with combinators', () => {
            const code = 'var obj = { a: 1, b: 2 };';
            const results = foresta.query(code, 'Property + Property');
            
            expect(results.length).toBe(1);
            expect(results[0].key.name).toBe('b');
        });

        test('should work with complex queries', () => {
            const code = `
                var getValue = function() { return 42; };
                var getName = function() { return "test"; };
                var other = 123;
            `;
            const results = foresta.query(code, 'Identifier[name~/^get[A-Z]/]');
            
            const names = [...new Set(results.map(r => r.name).filter(n => n))];
            expect(names).toContain('getValue');
            expect(names).toContain('getName');
            expect(names).not.toContain('other');
        });

        test('should work with logical OR', () => {
            const code = `
                var x = 1;
                function test() {}
                var y = 2;
            `;
            const results = foresta.query(code, 'VariableDeclaration, FunctionDeclaration');
            
            expect(results.length).toBe(3);
            const types = results.map(r => r.type);
            expect(types).toContain('VariableDeclaration');
            expect(types).toContain('FunctionDeclaration');
        });

        test('should work with module code', () => {
            const code = 'export function test() { return 42; }';
            const results = foresta.query(code, 'ExportNamedDeclaration', { sourceType: 'module' });
            
            expect(results.length).toBe(1);
            expect(results[0].type).toBe('ExportNamedDeclaration');
        });

        test('should return empty array for no matches', () => {
            const code = 'var x = 1;';
            const results = foresta.query(code, 'FunctionDeclaration');
            
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(0);
        });

        test('should handle empty code', () => {
            const code = '';
            const results = foresta.query(code, 'Literal');
            
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(0);
        });
    });

    describe('Traditional API compatibility', () => {
        test('should still work with traditional new foresta() constructor', () => {
            const code = 'var x = 42;';
            const ast = foresta.parse(code);
            const query = new foresta('Literal');
            query.visit(ast);
            
            expect(query.results.length).toBe(1);
            expect(query.results[0].value).toBe(42);
        });

        test('should support property modifiers with traditional API', () => {
            const code = `
                var obj = {
                    update: function() {
                        return 42;
                    }
                };
            `;
            const ast = foresta.parse(code);
            const query = new foresta('ObjectExpression Property #update:parent:value');
            query.visit(ast);
            
            expect(query.results.length).toBe(1);
            expect(query.results[0].type).toBe('FunctionExpression');
        });

        test('should allow mixing new API and traditional API', () => {
            const code = 'var x = 42; var y = 100;';
            
            // Use query API
            const quickResults = foresta.query(code, 'Literal');
            
            // Use traditional API
            const ast = foresta.parse(code);
            const traditionalQuery = new foresta('Literal');
            traditionalQuery.visit(ast);
            
            expect(quickResults.length).toBe(traditionalQuery.results.length);
            expect(quickResults[0].value).toBe(traditionalQuery.results[0].value);
        });
    });
});
