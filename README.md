![Foresta](logo.png?raw=true)

Selector engine for JavaScript syntax trees. Lets you write powerful, CSS-like queries against abstract syntax trees generated 
by Esprima (http://esprima.org/) to pull out specific expressions from your JavaScript code.

## Features

Foresta.js provides a rich query language inspired by CSS selectors, supporting:

- **Type Selectors**: Match AST nodes by type (e.g., `Literal`, `FunctionExpression`)
- **Identifier Selectors**: Match specific identifiers by name (e.g., `#myVar`)
- **Attribute Selectors**: Filter by node properties with various operators
- **Pseudo-Classes**: Advanced filtering (`:not()`, `:has()`, `:first-child`, `:empty`, etc.)
- **Combinators**: Express structural relationships (`>`, `+`, `~`, descendant)
- **Logical OR**: Combine multiple selectors with commas
- **RegExp Patterns**: Match node properties using regular expressions
- **Simple API**: Parse and query in one call, no need to manage esprima directly

## Installation

```bash
npm install foresta
```

**Note**: Foresta.js automatically manages the esprima dependency for you. You don't need to install or import esprima separately unless you want to use it for other purposes.

## Quick Start

```javascript
const foresta = require('foresta');

const code = `
  var x = 42;
  var y = "hello";
`;

// Simple one-line query (recommended)
const literals = foresta.query(code, "Literal");
console.log(literals); // All literal values in the code
```

## API

### `foresta.query(code, selector, options)`

Parse JavaScript code and execute a query in one call. This is the recommended way to use Foresta.js.

**Parameters:**
- `code` (string): The JavaScript code to parse
- `selector` (string): The selector query
- `options` (object, optional): Parser options
  - `sourceType` (string): `'script'` (default) or `'module'`

**Returns:** Array of matched AST nodes

**Examples:**

```javascript
// Find all literals
const literals = foresta.query('var x = 42;', 'Literal');

// Find identifiers starting with "get"
const getters = foresta.query(code, 'Identifier[name^="get"]');

// Query ES6 module code
const exports = foresta.query('export const x = 1;', 'ExportNamedDeclaration', { sourceType: 'module' });
```

### `foresta.parse(code, options)`

Parse JavaScript code into an AST. Useful if you need to run multiple queries on the same code.

**Parameters:**
- `code` (string): The JavaScript code to parse
- `options` (object, optional): Parser options
  - `sourceType` (string): `'script'` (default) or `'module'`

**Returns:** Esprima AST object

**Example:**

```javascript
const ast = foresta.parse('var x = 42;');
// Use the AST with traditional API
```

### Traditional API (Constructor)

For advanced use cases or when you need more control:

```javascript
const ast = foresta.parse(code);
const query = foresta.query(code, "Literal");
query.visit(ast);
console.log(query.results); // Array of matched nodes
```

## Usage Examples

### Simple Queries

```javascript
const foresta = require('foresta');

const code = `
  var x = 42;
  var getValue = function() { return 100; };
  var name = "test";
`;

// Find all literals
const literals = foresta.query(code, 'Literal');
// Returns: [42, 100, "test"]

// Find specific variable
const myVar = foresta.query(code, '#getValue');
// Returns: [Identifier node for 'getValue']

// Find function expressions
const functions = foresta.query(code, 'FunctionExpression');
// Returns: [FunctionExpression node]
```

## Selector Types

### 1. Type Selectors

Match AST nodes by their type:

```javascript
// Find all literals
foresta.query(code, "Literal")

// Find all function expressions
foresta.query(code, "FunctionExpression")

// Find all binary expressions
foresta.query(code, "BinaryExpression")

// Match any node type (wildcard)
foresta.query(code, "*")
```

### 2. Identifier Selectors

Match identifiers by their specific name:

```javascript
// Find the identifier named "myVar"
foresta.query(code, "#myVar")

// Find the identifier named "config"
foresta.query(code, "#config")
```

### 3. Attribute Selectors

Filter nodes by their properties using various operators:

#### Exact Match `[property=value]`
```javascript
// Find literals with value 42
foresta.query(code, "Literal[value=42]")

// Find identifiers named "foo"
foresta.query(code, "Identifier[name=foo]")

// Find string literals with value "hello"
foresta.query(code, 'Literal[value="hello"]')
```

#### Starts With `[property^="value"]`
```javascript
// Find identifiers starting with "is"
foresta.query(code, 'Identifier[name^="is"]')

// Find identifiers starting with "get"
foresta.query(code, 'Identifier[name^="get"]')
```

#### Ends With `[property$="value"]`
```javascript
// Find identifiers ending with "Value"
foresta.query(code, 'Identifier[name$="Value"]')

// Find identifiers ending with "Handler"
foresta.query(code, 'Identifier[name$="Handler"]')
```

#### Contains `[property*="value"]`
```javascript
// Find identifiers containing "test"
foresta.query(code, 'Identifier[name*="test"]')

// Find identifiers containing "temp"
foresta.query(code, 'Identifier[name*="temp"]')
```

#### RegExp Pattern `[property~/pattern/]`
```javascript
// Find identifiers matching pattern (e.g., getValue, getName)
foresta.query(code, 'Identifier[name~/^get[A-Z]/]')

// Find identifiers with numeric suffix
foresta.query(code, 'Identifier[name~/item[0-9]/]')
```

#### Nested Properties `[path.to.property=value]`
```javascript
// Find fetch() calls
foresta.query(code, 'CallExpression[callee.name=fetch]')

// Find specific member expressions
foresta.query(code, 'MemberExpression[object.name=console]')
```

### 4. Pseudo-Classes

#### `:not(selector)`
Negate a selector:

```javascript
// Find all VariableDeclarators except those named "foo"
foresta.query(code, 'VariableDeclarator:not([id.name=foo])')

// Find all literals except 42
foresta.query(code, 'Literal:not([value=42])')
```

#### `:has(selector)`
Match nodes containing a descendant that matches the selector:

```javascript
// Find ObjectExpressions that have properties
foresta.query(code, 'ObjectExpression:has(Property)')

// Find functions that have a return statement
foresta.query(code, 'FunctionExpression:has(ReturnStatement)')
```

#### `:first-child`
Match the first child in a collection:

```javascript
// Find the first property in objects
foresta.query(code, 'Property:first-child')

// Find the first variable declarator
foresta.query(code, 'VariableDeclarator:first-child')
```

#### `:last-child`
Match the last child in a collection:

```javascript
// Find the last property in objects
foresta.query(code, 'Property:last-child')
```

#### `:nth-child(n)`
Match the nth child (1-indexed):

```javascript
// Find the second property
foresta.query(code, 'Property:nth-child(2)')

// Find the third declarator
foresta.query(code, 'VariableDeclarator:nth-child(3)')
```

#### `:empty`
Match nodes with no children:

```javascript
// Find empty objects
foresta.query(code, 'ObjectExpression:empty')

// Find empty arrays
foresta.query(code, 'ArrayExpression:empty')
```

### 5. Combinators

Express structural relationships between nodes:

#### Descendant (space)
Matches elements that are descendants (any level deep) with consecutive parent chain:

```javascript
// Find all global variable declarations
foresta.query(code, 'Program VariableDeclaration VariableDeclarator')

// Find properties within objects within variables
foresta.query(code, 'VariableDeclarator ObjectExpression Property')
```

#### Direct Child `>`
Matches elements that are direct children:

```javascript
// Find VariableDeclarations directly inside BlockStatements
foresta.query(code, 'BlockStatement > VariableDeclaration')

// Find literals directly inside SwitchCase
foresta.query(code, 'SwitchCase > Literal')
```

#### Adjacent Sibling `+`
Matches the immediately following sibling:

```javascript
// Find a Property that immediately follows another Property
foresta.query(code, 'Property + Property')
```

#### General Sibling `~`
Matches any following sibling:

```javascript
// Find any Property that follows another Property
foresta.query(code, 'Property ~ Property')
```

### 6. Logical OR (Comma)

Combine multiple selectors:

```javascript
// Find either VariableDeclaration or FunctionDeclaration
foresta.query(code, 'VariableDeclaration, FunctionDeclaration')

// Find either Literal or Identifier
foresta.query(code, 'Literal, Identifier')
```

### 7. Contextual Property Modifiers (Legacy)

Access properties of matched nodes:

```javascript
// Get the function expression from a property named "update"
foresta.query(code, 'ObjectExpression Property #update:parent:value')

// Get the parent of a matched identifier
foresta.query(code, '#myVar:parent')
```

## Advanced Examples

### Find All Fetch Calls
```javascript
foresta.query(code, 'CallExpression[callee.name=fetch]')
```

### Find Getter Methods
```javascript
foresta.query(code, 'Identifier[name~/^get[A-Z]/]')
```

### Find Export Functions
```javascript
foresta.query(code, 'ExportNamedDeclaration FunctionDeclaration')
// or with direct child
foresta.query(code, 'ExportNamedDeclaration > FunctionDeclaration')
```

### Find Functions with Return Statements
```javascript
foresta.query(code, 'FunctionExpression:has(ReturnStatement)')
```

### Find If Statements with Returns Inside
```javascript
foresta.query(code, 'IfStatement:has(ReturnStatement)')
```

### Complex Control Flow
```javascript
// Find VariableDeclarators that are NOT named "temp" 
// and whose value is a function
foresta.query(code, 'VariableDeclarator:not([id.name=temp]):has(FunctionExpression)')
```

## Working with Results

```javascript
const foresta = require('foresta');
const esprima = require('esprima');

const code = `
  var theValue = 4 + 2;
  var config = {
    update: function() {
      return "hello";
    }
  };
`;

const ast = esprima.parseScript(code);

// Example 1: Find all literal values
const literals = foresta.query(code, "Literal");
literals.visit(ast);
console.log(literals.results); // [4, 2, "hello"]

// Example 2: Find a specific variable
const variable = foresta.query(code, "#theValue");
variable.visit(ast);
console.log(variable.results[0].name); // "theValue"

// Example 3: Find global variables
const globals = foresta.query(code, "Program VariableDeclaration VariableDeclarator");
globals.visit(ast);
console.log(globals.results.map(r => r.id.name)); // ["theValue", "config"]

// Example 4: Find all function expressions
const functions = foresta.query(code, "FunctionExpression");
functions.visit(ast);
console.log(functions.results.length); // 1
```

## Supported AST Node Types

Foresta.js supports all standard ESTree AST node types including:

- `Program`, `Identifier`, `Literal`
- `VariableDeclaration`, `VariableDeclarator`
- `FunctionDeclaration`, `FunctionExpression`, `ArrowFunctionExpression`
- `BlockStatement`, `ExpressionStatement`, `ReturnStatement`
- `IfStatement`, `SwitchStatement`, `SwitchCase`
- `BinaryExpression`, `AssignmentExpression`, `MemberExpression`
- `CallExpression`, `NewExpression`
- `ObjectExpression`, `Property`, `ArrayExpression`
- `ExportNamedDeclaration`, `ExportDefaultDeclaration`
- `AwaitExpression`
- And more...

## API Reference

### `foresta(query)`

Creates a new query instance.

**Parameters:**
- `query` (string): The selector query

**Returns:** Query instance with `visit()` method and `results` array

### `query.visit(ast)`

Executes the query against an AST.

**Parameters:**
- `ast` (object): The AST to query (typically from `esprima.parseScript()` or `esprima.parseModule()`)

**Returns:** void (results are stored in `query.results`)

### `query.results`

Array containing all matched nodes from the most recent `visit()` call.

## Browser Usage

```html
<script src="path/to/esprima.js"></script>
<script src="path/to/foresta.umd.js"></script>
<script>
  const code = 'var x = 42;';
  const ast = esprima.parseScript(code);
  const query = foresta.query(code, 'Literal');
  query.visit(ast);
  console.log(query.results);
</script>
```

## ES Module Usage

```javascript
import foresta from 'foresta';
import { parseScript } from 'esprima';

const ast = parseScript('var x = 42;');
const query = foresta.query(code, 'Literal');
query.visit(ast);
console.log(query.results);
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
