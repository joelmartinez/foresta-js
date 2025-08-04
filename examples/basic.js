const foresta = require('../dist/foresta');
const esprima = require('esprima');

// Example code to analyze
const code = `
var theValue = 4 + 2;
var config = {
  update: function() {
    var s = "hello";
    return s;
  },
  data: [1, 2, 3]
};
`;

console.log('=== Foresta.js Examples ===\n');

// Parse the code with esprima
const ast = esprima.parseScript(code);

// Example 1: Find all literal values
console.log('1. All literal values:');
const literalQuery = new foresta("Literal");
literalQuery.visit(ast);
literalQuery.results.forEach((result, i) => {
  console.log(`   ${i + 1}. ${JSON.stringify(result.value)} (${typeof result.value})`);
});

// Example 2: Find specific variable by name
console.log('\n2. Variable named "theValue":');
const identifierQuery = new foresta("#theValue");
identifierQuery.visit(ast);
if (identifierQuery.results.length > 0) {
  const result = identifierQuery.results[0];
  console.log(`   Found: ${result.name}`);
  console.log(`   Initialization: ${result.parent.init.type} (${result.parent.init.operator})`);
}

// Example 3: Find all global variables
console.log('\n3. All global variable declarations:');
const globalVarsQuery = new foresta("Program VariableDeclaration VariableDeclarator");
globalVarsQuery.visit(ast);
globalVarsQuery.results.forEach((result, i) => {
  console.log(`   ${i + 1}. ${result.id.name}`);
});

// Example 4: Use property modifiers to find function expression
console.log('\n4. Function expression using property modifier:');
const functionQuery = new foresta("ObjectExpression Property #update:parent:value");
functionQuery.visit(ast);
if (functionQuery.results.length > 0) {
  const result = functionQuery.results[0];
  console.log(`   Found: ${result.type} with ${result.params.length} parameters`);
}

// Example 5: Find all binary expressions
console.log('\n5. All binary expressions:');
const binaryQuery = new foresta("BinaryExpression");
binaryQuery.visit(ast);
binaryQuery.results.forEach((result, i) => {
  console.log(`   ${i + 1}. ${result.left.value || result.left.name} ${result.operator} ${result.right.value || result.right.name}`);
});

console.log('\n=== End Examples ===');