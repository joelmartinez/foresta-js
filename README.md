Foresta
=======

Selector engine for JavaScript syntax trees. Lets you write queries against abstract syntax trees generated 
by Esprima (http://esprima.org/) to pull out specific expressions from the program.

There are three basic kinds of query components you can use:

* `#IdentifierName` - Identifier selectors let you match against an Identifier expression's name property. So for example, if you want to select a specific variable declaration you can use this.
* `ExpressionType` - You can match a specific expression type by simply using the type name in the selector. The full list of expression types can be found in the Mozilla Spidermonkey Parser API documentation: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API
* `*` - wildcard, will match any expression type.

The query language also supports _contextual property modifiers_. These modifiers can be added to the last query component to let you refine what object gets put into the results list.
Property modifiers are added with a semicolon: `<component>:property:modifier`

*Examples:*

You can pull all literal values in your program by using the query `"Literal"`.

To get the initialization expression of a variable named `"theValue"` (ie. `var theValue = 4+2;`)
```
var query = new foresta("#theValue");
query.visit(theSyntaxTree);
var expression = v.results[0].init; // the binary expression for '4+2'
```

All global variables declared in this javascript program can be selected with the selector `"Program VariableDeclaration VariableDeclarator"`

Contextual Property Modifiers can be useful to select a specific expression that is referred to by an identifer. For example, given the following expression:

```
var a = {
  update: function() {
  	var s;
	}
};
```

You can get the `FunctionExpression` by issuing this query: `ObjectExpression Property #update:parent:value`.
