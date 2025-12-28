const foresta = require('../src/foresta');
const esprima = require('esprima');

console.log('=== Advanced Foresta.js Selector Examples ===\n');

// Example code with various patterns
const code = `
  // Variables with different patterns
  var isValid = true;
  var isEnabled = false;
  var hasPermission = true;
  var getValue = function() { return 42; };
  var getName = function() { return "test"; };
  var setValue = function(v) { value = v; };
  
  // Objects and properties
  var config = {
    first: 1,
    second: 2,
    third: 3,
    nested: {
      value: 100
    }
  };
  
  var empty = {};
  var emptyArray = [];
  
  // Functions and control flow
  function processData(data) {
    if (data) {
      return data * 2;
    }
    return 0;
  }
  
  // API calls
  fetch('/api/users');
  fetch('/api/posts');
  console.log('test');
  
  // Switch statement
  switch (x) {
    case 1:
      break;
    case 2:
      break;
    case 3:
      break;
  }
`;

const ast = esprima.parseScript(code);

// Example 1: Attribute Selectors - Exact Match
console.log('1. Literal with value 42:');
const literal42 = new foresta('Literal[value=42]');
literal42.visit(ast);
console.log(`   Found ${literal42.results.length} literal(s) with value 42`);

// Example 2: Attribute Selectors - Starts With
console.log('\n2. Identifiers starting with "is":');
const isVars = new foresta('Identifier[name^="is"]');
isVars.visit(ast);
const isNames = [...new Set(isVars.results.map(r => r.name).filter(n => n))];
console.log(`   Found: ${isNames.join(', ')}`);

// Example 3: Attribute Selectors - Ends With
console.log('\n3. Identifiers ending with "Value":');
const valueVars = new foresta('Identifier[name$="Value"]');
valueVars.visit(ast);
const valueNames = [...new Set(valueVars.results.map(r => r.name).filter(n => n))];
console.log(`   Found: ${valueNames.join(', ')}`);

// Example 4: Attribute Selectors - Contains
console.log('\n4. Identifiers containing "name":');
const nameVars = new foresta('Identifier[name*="name"]');
nameVars.visit(ast);
const nameNames = [...new Set(nameVars.results.map(r => r.name).filter(n => n))];
console.log(`   Found: ${nameNames.join(', ')}`);

// Example 5: RegExp Pattern Selectors
console.log('\n5. Identifiers matching pattern /^get[A-Z]/:');
const getters = new foresta('Identifier[name~/^get[A-Z]/]');
getters.visit(ast);
const getterNames = [...new Set(getters.results.map(r => r.name).filter(n => n))];
console.log(`   Found: ${getterNames.join(', ')}`);

// Example 6: Nested Property Selectors
console.log('\n6. CallExpressions where callee.name is "fetch":');
const fetchCalls = new foresta('CallExpression[callee.name=fetch]');
fetchCalls.visit(ast);
console.log(`   Found ${fetchCalls.results.length} fetch call(s)`);

// Example 7: :not() Pseudo-Class
console.log('\n7. Literals that are NOT 42:');
const notFortyTwo = new foresta('Literal:not([value=42])');
notFortyTwo.visit(ast);
console.log(`   Found ${notFortyTwo.results.length} non-42 literal(s)`);

// Example 8: :first-child Pseudo-Class
console.log('\n8. First property in objects:');
const firstProps = new foresta('Property:first-child');
firstProps.visit(ast);
const firstPropNames = firstProps.results.map(r => r.key.name || r.key.value);
console.log(`   Found: ${firstPropNames.join(', ')}`);

// Example 9: :last-child Pseudo-Class
console.log('\n9. Last property in objects:');
const lastProps = new foresta('Property:last-child');
lastProps.visit(ast);
const lastPropNames = lastProps.results.map(r => r.key.name || r.key.value);
console.log(`   Found: ${lastPropNames.join(', ')}`);

// Example 10: :nth-child() Pseudo-Class
console.log('\n10. Second property in objects:');
const secondProps = new foresta('Property:nth-child(2)');
secondProps.visit(ast);
const secondPropNames = secondProps.results.map(r => r.key.name || r.key.value);
console.log(`   Found: ${secondPropNames.join(', ')}`);

// Example 11: :empty Pseudo-Class
console.log('\n11. Empty objects:');
const emptyObjs = new foresta('ObjectExpression:empty');
emptyObjs.visit(ast);
console.log(`   Found ${emptyObjs.results.length} empty object(s)`);

// Example 12: :has() Pseudo-Class
console.log('\n12. FunctionDeclarations that have a ReturnStatement:');
const funcsWithReturn = new foresta('FunctionDeclaration:has(ReturnStatement)');
funcsWithReturn.visit(ast);
const funcNames = funcsWithReturn.results.map(r => r.id ? r.id.name : 'anonymous');
console.log(`   Found: ${funcNames.join(', ')}`);

// Example 13: Direct Child Combinator >
console.log('\n13. Literals directly inside SwitchCase:');
const caseLiterals = new foresta('SwitchCase > Literal');
caseLiterals.visit(ast);
const caseValues = caseLiterals.results.map(r => r.value);
console.log(`   Found case values: ${caseValues.join(', ')}`);

// Example 14: Adjacent Sibling Combinator +
console.log('\n14. Properties adjacent to other properties:');
const adjacentProps = new foresta('Property + Property');
adjacentProps.visit(ast);
const adjacentNames = adjacentProps.results.map(r => r.key.name || r.key.value);
console.log(`   Found: ${adjacentNames.join(', ')}`);

// Example 15: Logical OR (Comma)
console.log('\n15. Either VariableDeclaration or FunctionDeclaration:');
const varsOrFuncs = new foresta('VariableDeclaration, FunctionDeclaration');
varsOrFuncs.visit(ast);
const types = varsOrFuncs.results.map(r => r.type);
const varCount = types.filter(t => t === 'VariableDeclaration').length;
const funcCount = types.filter(t => t === 'FunctionDeclaration').length;
console.log(`   Found ${varCount} variable declaration(s) and ${funcCount} function declaration(s)`);

// Example 16: Complex Query
console.log('\n16. IfStatement containing a ReturnStatement:');
const ifWithReturn = new foresta('IfStatement:has(ReturnStatement)');
ifWithReturn.visit(ast);
console.log(`   Found ${ifWithReturn.results.length} if statement(s) with return`);

// Example 17: Multiple Conditions
console.log('\n17. First VariableDeclarator in each declaration:');
const firstDeclarators = new foresta('VariableDeclarator:first-child');
firstDeclarators.visit(ast);
const firstDeclNames = firstDeclarators.results.map(r => r.id.name);
console.log(`   Found: ${firstDeclNames.slice(0, 5).join(', ')}...`);

// Example 18: Property Modifiers (Legacy)
console.log('\n18. Using property modifiers to get parent:');
const withModifier = new foresta('#isValid:parent');
withModifier.visit(ast);
if (withModifier.results.length > 0) {
    console.log(`   Parent type: ${withModifier.results[0].type}`);
}

console.log('\n=== End Advanced Examples ===');
