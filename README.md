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

## Installation

```bash
npm install foresta
```

## Basic Usage

```javascript
const foresta = require('foresta');
const esprima = require('esprima');

const code = `
  var x = 42;
  var y = "hello";
`;

const ast = esprima.parseScript(code);
const query = new foresta("Literal");
query.visit(ast);

console.log(query.results); // All literal values in the code
```

## Selector Types

### 1. Type Selectors

Match AST nodes by their type:

```javascript
// Find all literals
new foresta("Literal")

// Find all function expressions
new foresta("FunctionExpression")

// Find all binary expressions
new foresta("BinaryExpression")

// Match any node type (wildcard)
new foresta("*")
```

### 2. Identifier Selectors

Match identifiers by their specific name:

```javascript
// Find the identifier named "myVar"
new foresta("#myVar")

// Find the identifier named "config"
new foresta("#config")
```

### 3. Attribute Selectors

Filter nodes by their properties using various operators:

#### Exact Match `[property=value]`
```javascript
// Find literals with value 42
new foresta("Literal[value=42]")

// Find identifiers named "foo"
new foresta("Identifier[name=foo]")

// Find string literals with value "hello"
new foresta('Literal[value="hello"]')
```

#### Starts With `[property^="value"]`
```javascript
// Find identifiers starting with "is"
new foresta('Identifier[name^="is"]')

// Find identifiers starting with "get"
new foresta('Identifier[name^="get"]')
```

#### Ends With `[property$="value"]`
```javascript
// Find identifiers ending with "Value"
new foresta('Identifier[name$="Value"]')

// Find identifiers ending with "Handler"
new foresta('Identifier[name$="Handler"]')
```

#### Contains `[property*="value"]`
```javascript
// Find identifiers containing "test"
new foresta('Identifier[name*="test"]')

// Find identifiers containing "temp"
new foresta('Identifier[name*="temp"]')
```

#### RegExp Pattern `[property~/pattern/]`
```javascript
// Find identifiers matching pattern (e.g., getValue, getName)
new foresta('Identifier[name~/^get[A-Z]/]')

// Find identifiers with numeric suffix
new foresta('Identifier[name~/item[0-9]/]')
```

#### Nested Properties `[path.to.property=value]`
```javascript
// Find fetch() calls
new foresta('CallExpression[callee.name=fetch]')

// Find specific member expressions
new foresta('MemberExpression[object.name=console]')
```

### 4. Pseudo-Classes

#### `:not(selector)`
Negate a selector:

```javascript
// Find all VariableDeclarators except those named "foo"
new foresta('VariableDeclarator:not([id.name=foo])')

// Find all literals except 42
new foresta('Literal:not([value=42])')
```

#### `:has(selector)`
Match nodes containing a descendant that matches the selector:

```javascript
// Find ObjectExpressions that have properties
new foresta('ObjectExpression:has(Property)')

// Find functions that have a return statement
new foresta('FunctionExpression:has(ReturnStatement)')
```

#### `:first-child`
Match the first child in a collection:

```javascript
// Find the first property in objects
new foresta('Property:first-child')

// Find the first variable declarator
new foresta('VariableDeclarator:first-child')
```

#### `:last-child`
Match the last child in a collection:

```javascript
// Find the last property in objects
new foresta('Property:last-child')
```

#### `:nth-child(n)`
Match the nth child (1-indexed):

```javascript
// Find the second property
new foresta('Property:nth-child(2)')

// Find the third declarator
new foresta('VariableDeclarator:nth-child(3)')
```

#### `:empty`
Match nodes with no children:

```javascript
// Find empty objects
new foresta('ObjectExpression:empty')

// Find empty arrays
new foresta('ArrayExpression:empty')
```

### 5. Combinators

Express structural relationships between nodes:

#### Descendant (space)
Matches elements that are descendants (any level deep) with consecutive parent chain:

```javascript
// Find all global variable declarations
new foresta('Program VariableDeclaration VariableDeclarator')

// Find properties within objects within variables
new foresta('VariableDeclarator ObjectExpression Property')
```

#### Direct Child `>`
Matches elements that are direct children:

```javascript
// Find VariableDeclarations directly inside BlockStatements
new foresta('BlockStatement > VariableDeclaration')

// Find literals directly inside SwitchCase
new foresta('SwitchCase > Literal')
```

#### Adjacent Sibling `+`
Matches the immediately following sibling:

```javascript
// Find a Property that immediately follows another Property
new foresta('Property + Property')
```

#### General Sibling `~`
Matches any following sibling:

```javascript
// Find any Property that follows another Property
new foresta('Property ~ Property')
```

### 6. Logical OR (Comma)

Combine multiple selectors:

```javascript
// Find either VariableDeclaration or FunctionDeclaration
new foresta('VariableDeclaration, FunctionDeclaration')

// Find either Literal or Identifier
new foresta('Literal, Identifier')
```

### 7. Contextual Property Modifiers (Legacy)

Access properties of matched nodes:

```javascript
// Get the function expression from a property named "update"
new foresta('ObjectExpression Property #update:parent:value')

// Get the parent of a matched identifier
new foresta('#myVar:parent')
```

## Advanced Examples

### Find All Fetch Calls
```javascript
new foresta('CallExpression[callee.name=fetch]')
```

### Find Getter Methods
```javascript
new foresta('Identifier[name~/^get[A-Z]/]')
```

### Find Export Functions
```javascript
new foresta('ExportNamedDeclaration FunctionDeclaration')
// or with direct child
new foresta('ExportNamedDeclaration > FunctionDeclaration')
```

### Find Functions with Return Statements
```javascript
new foresta('FunctionExpression:has(ReturnStatement)')
```

### Find If Statements with Returns Inside
```javascript
new foresta('IfStatement:has(ReturnStatement)')
```

### Complex Control Flow
```javascript
// Find VariableDeclarators that are NOT named "temp" 
// and whose value is a function
new foresta('VariableDeclarator:not([id.name=temp]):has(FunctionExpression)')
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
const literals = new foresta("Literal");
literals.visit(ast);
console.log(literals.results); // [4, 2, "hello"]

// Example 2: Find a specific variable
const variable = new foresta("#theValue");
variable.visit(ast);
console.log(variable.results[0].name); // "theValue"

// Example 3: Find global variables
const globals = new foresta("Program VariableDeclaration VariableDeclarator");
globals.visit(ast);
console.log(globals.results.map(r => r.id.name)); // ["theValue", "config"]

// Example 4: Find all function expressions
const functions = new foresta("FunctionExpression");
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
  const query = new foresta('Literal');
  query.visit(ast);
  console.log(query.results);
</script>
```

## ES Module Usage

```javascript
import foresta from 'foresta';
import { parseScript } from 'esprima';

const ast = parseScript('var x = 42;');
const query = new foresta('Literal');
query.visit(ast);
console.log(query.results);
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
