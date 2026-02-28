function foresta(query) {
    this.query = query;

    // Query parsing methods - defined first so they can be called during initialization
    this.parseQuery = function(query) {
        // Split by comma for OR groups
        var groups = [];
        var currentGroup = '';
        var parenDepth = 0;
        var bracketDepth = 0;
        
        for (var i = 0; i < query.length; i++) {
            var ch = query[i];
            if (ch === '(') parenDepth++;
            else if (ch === ')') parenDepth--;
            else if (ch === '[') bracketDepth++;
            else if (ch === ']') bracketDepth--;
            else if (ch === ',' && parenDepth === 0 && bracketDepth === 0) {
                if (currentGroup.trim()) {
                    groups.push(this.parseSelectorSequence(currentGroup.trim()));
                }
                currentGroup = '';
                continue;
            }
            currentGroup += ch;
        }
        if (currentGroup.trim()) {
            groups.push(this.parseSelectorSequence(currentGroup.trim()));
        }
        
        return groups.length > 0 ? groups : [[]];
    };
    
    this.parseSelectorSequence = function(sequence) {
        // Parse a sequence of selectors with combinators
        var selectors = [];
        var current = '';
        var i = 0;
        var combinator = ' '; // default descendant
        var bracketDepth = 0;
        
        while (i < sequence.length) {
            var ch = sequence[i];
            
            // Track bracket depth
            if (ch === '[') {
                bracketDepth++;
            } else if (ch === ']') {
                bracketDepth--;
            }
            
            // Only recognize combinators outside of brackets
            if (bracketDepth === 0) {
                // Skip whitespace at the start
                if (current === '' && /\s/.test(ch)) {
                    i++;
                    continue;
                }
                
                // Check for combinators
                if (/\s/.test(ch) && current !== '') {
                    // Space combinator (descendant)
                    var selector = this.parseSelector(current.trim());
                    selector.combinator = combinator;
                    selectors.push(selector);
                    current = '';
                    combinator = ' ';
                    i++;
                    continue;
                } else if (ch === '>' || ch === '+' || ch === '~') {
                    if (current.trim()) {
                        var selector = this.parseSelector(current.trim());
                        selector.combinator = combinator;
                        selectors.push(selector);
                        current = '';
                    }
                    combinator = ch;
                    i++;
                    // Skip whitespace after combinator
                    while (i < sequence.length && /\s/.test(sequence[i])) {
                        i++;
                    }
                    continue;
                }
            }
            
            current += ch;
            i++;
        }
        
        if (current.trim()) {
            var selector = this.parseSelector(current.trim());
            selector.combinator = combinator;
            selectors.push(selector);
        }
        
        return selectors;
    };
    
    this.parseSelector = function(selectorStr) {
        var selector = {
            type: null,
            identifier: null,
            attributes: [],
            pseudoClasses: [],
            propertySelectors: [],
            combinator: ' ',
            test: null
        };
        
        var i = 0;
        var baseSelector = '';
        
        // Extract base selector (type or identifier)
        while (i < selectorStr.length && selectorStr[i] !== '[' && selectorStr[i] !== ':') {
            baseSelector += selectorStr[i];
            i++;
        }
        
        // Parse base selector
        if (baseSelector.startsWith('#')) {
            selector.identifier = baseSelector.substring(1);
            selector.type = 'Identifier';
        } else if (baseSelector === '*') {
            selector.type = '*';
        } else if (baseSelector) {
            selector.type = baseSelector;
        }
        
        // Parse attributes and pseudo-classes
        while (i < selectorStr.length) {
            if (selectorStr[i] === '[') {
                // Attribute selector - find matching closing bracket
                var bracketDepth = 1;
                var endBracket = i + 1;
                while (endBracket < selectorStr.length && bracketDepth > 0) {
                    if (selectorStr[endBracket] === '[') {
                        bracketDepth++;
                    } else if (selectorStr[endBracket] === ']') {
                        bracketDepth--;
                    }
                    if (bracketDepth > 0) {
                        endBracket++;
                    }
                }
                if (endBracket < selectorStr.length) {
                    var attrStr = selectorStr.substring(i + 1, endBracket);
                    selector.attributes.push(this.parseAttribute(attrStr));
                    i = endBracket + 1;
                } else {
                    i++;
                }
            } else if (selectorStr[i] === ':') {
                // Check for pseudo-classes
                var remaining = selectorStr.substring(i + 1);
                
                // Check for pseudo-class patterns
                if (remaining.match(/^(not|has|first-child|last-child|nth-child|empty)/)) {
                    var pseudoMatch = remaining.match(/^([a-z-]+)(?:\(([^)]+)\))?/);
                    if (pseudoMatch) {
                        selector.pseudoClasses.push({
                            name: pseudoMatch[1],
                            argument: pseudoMatch[2] || null
                        });
                        i += pseudoMatch[0].length + 1;
                    } else {
                        i++;
                    }
                } else {
                    // Property selector (legacy)
                    var colonIdx = selectorStr.indexOf(':', i + 1);
                    var endIdx = colonIdx !== -1 ? colonIdx : selectorStr.length;
                    var propName = selectorStr.substring(i + 1, endIdx);
                    if (propName) {
                        selector.propertySelectors.push(propName);
                    }
                    i = endIdx;
                }
            } else {
                i++;
            }
        }
        
        // Create test function
        selector.test = this.createTestFunction(selector);
        selector.value = selector.type; // For legacy compatibility
        
        return selector;
    };
    
    this.parseAttribute = function(attrStr) {
        // Parse attribute selector: [property operator value]
        // Operators: =, ^=, $=, *=, ~= (regex)
        var match;
        var PROPERTY_PATTERN = '([a-zA-Z._]+)'; // Matches property names including dot notation
        
        // Regex pattern: [property~/pattern/]
        // Note: User-provided regex patterns are executed as-is. In a production environment,
        // consider adding validation or timeout mechanisms to prevent ReDoS attacks.
        if ((match = attrStr.match(new RegExp('^' + PROPERTY_PATTERN + '~\\/(.+)\\/$')))) {
            return {
                property: match[1],
                operator: '~=',
                value: new RegExp(match[2])
            };
        }
        
        // Starts with: [property^="value"]
        if ((match = attrStr.match(new RegExp('^' + PROPERTY_PATTERN + '\\^=["\']{0,1}([^"\']*)["\']{0,1}$')))) {
            return {
                property: match[1],
                operator: '^=',
                value: match[2]
            };
        }
        
        // Ends with: [property$="value"]
        if ((match = attrStr.match(new RegExp('^' + PROPERTY_PATTERN + '\\$=["\']{0,1}([^"\']*)["\']{0,1}$')))) {
            return {
                property: match[1],
                operator: '$=',
                value: match[2]
            };
        }
        
        // Contains: [property*="value"]
        if ((match = attrStr.match(new RegExp('^' + PROPERTY_PATTERN + '\\*=["\']{0,1}([^"\']*)["\']{0,1}$')))) {
            return {
                property: match[1],
                operator: '*=',
                value: match[2]
            };
        }
        
        // Exact match: [property=value] or [property="value"]
        if ((match = attrStr.match(new RegExp('^' + PROPERTY_PATTERN + '=(.+)$')))) {
            var value = match[2];
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
            // Try to parse as number
            var numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue.toString() === value) {
                value = numValue;
            }
            return {
                property: match[1],
                operator: '=',
                value: value
            };
        }
        
        return null;
    };
    
    this.createTestFunction = function(selector) {
        var that = this;
        return function(expression) {
            // Type check
            if (selector.type === '*') {
                // Wildcard matches anything
            } else if (selector.type === 'Identifier' && selector.identifier) {
                if (expression.type !== 'Identifier' || expression.name !== selector.identifier) {
                    return false;
                }
            } else if (selector.type && expression.type !== selector.type) {
                return false;
            }
            
            // Attribute checks
            for (var i = 0; i < selector.attributes.length; i++) {
                var attr = selector.attributes[i];
                if (!that.testAttribute(expression, attr)) {
                    return false;
                }
            }
            
            // Pseudo-class checks
            for (var i = 0; i < selector.pseudoClasses.length; i++) {
                var pseudo = selector.pseudoClasses[i];
                if (!that.testPseudoClass(expression, pseudo)) {
                    return false;
                }
            }
            
            return true;
        };
    };
    
    this.testAttribute = function(expression, attr) {
        if (!attr) return true;
        
        // Support nested property access (e.g., "callee.name")
        var value = this.getNestedProperty(expression, attr.property);
        
        if (value === undefined || value === null) {
            return false;
        }
        
        switch (attr.operator) {
            case '=':
                return value === attr.value;
            case '^=':
                return String(value).startsWith(attr.value);
            case '$=':
                return String(value).endsWith(attr.value);
            case '*=':
                return String(value).indexOf(attr.value) !== -1;
            case '~=':
                return attr.value.test(String(value));
            default:
                return false;
        }
    };
    
    this.getNestedProperty = function(obj, path) {
        var parts = path.split('.');
        var current = obj;
        for (var i = 0; i < parts.length; i++) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[parts[i]];
        }
        return current;
    };
    
    this.testPseudoClass = function(expression, pseudo) {
        switch (pseudo.name) {
            case 'first-child':
                return this.isFirstChild(expression);
            case 'last-child':
                return this.isLastChild(expression);
            case 'nth-child':
                return this.isNthChild(expression, pseudo.argument);
            case 'empty':
                return this.isEmpty(expression);
            case 'has':
                return this.hasDescendant(expression, pseudo.argument);
            case 'not':
                return !this.matchesSelector(expression, pseudo.argument);
            default:
                return true;
        }
    };
    
    this.isFirstChild = function(expression) {
        if (!expression.parent) return false;
        var siblings = this.getSiblings(expression);
        return siblings.length > 0 && siblings[0] === expression;
    };
    
    this.isLastChild = function(expression) {
        if (!expression.parent) return false;
        var siblings = this.getSiblings(expression);
        return siblings.length > 0 && siblings[siblings.length - 1] === expression;
    };
    
    this.isNthChild = function(expression, n) {
        if (!expression.parent) return false;
        var siblings = this.getSiblings(expression);
        var index = siblings.indexOf(expression);
        return index !== -1 && index === parseInt(n) - 1;
    };
    
    this.isEmpty = function(expression) {
        // Check if node has no children
        var childProps = ['body', 'declarations', 'properties', 'elements', 'arguments', 'params'];
        for (var i = 0; i < childProps.length; i++) {
            var prop = childProps[i];
            if (expression[prop]) {
                if (Array.isArray(expression[prop]) && expression[prop].length > 0) {
                    return false;
                }
            }
        }
        return true;
    };
    
    this.hasDescendant = function(expression, selectorStr) {
        var tempQuery = new foresta(selectorStr);
        tempQuery.visit(expression);
        return tempQuery.results.length > 0;
    };
    
    this.matchesSelector = function(expression, selectorStr) {
        var selector = this.parseSelector(selectorStr);
        return selector.test(expression);
    };
    
    this.getSiblings = function(expression) {
        if (!expression.parent) return [];
        var parent = expression.parent;
        
        // Find the array that contains this expression
        if (parent.body && Array.isArray(parent.body)) {
            return parent.body;
        } else if (parent.declarations && Array.isArray(parent.declarations)) {
            return parent.declarations;
        } else if (parent.properties && Array.isArray(parent.properties)) {
            return parent.properties;
        } else if (parent.elements && Array.isArray(parent.elements)) {
            return parent.elements;
        } else if (parent.arguments && Array.isArray(parent.arguments)) {
            return parent.arguments;
        } else if (parent.params && Array.isArray(parent.params)) {
            return parent.params;
        }
        
        return [];
    };

    // Parse the query into selector groups (comma-separated)
    this.selectorGroups = this.parseQuery(query);
    
    // Legacy support - convert to old filter format if simple query
    this.filters = [];
    if (this.selectorGroups.length === 1 && this.selectorGroups[0].length === 1) {
        var selector = this.selectorGroups[0][0];
        if (selector.combinator === ' ' && !selector.attributes && !selector.pseudoClasses) {
            this.filters = [selector];
        }
    } else if (this.selectorGroups.length === 1) {
        // Single group with multiple selectors (descendant)
        this.filters = this.selectorGroups[0];
    }

    this.results = new Array();
    var that = this;
    this.visitProgram = function (program) {
        var body = program.body;
        for (var i = 0; i < body.length; i++) {
            var expression = body[i];
            expression.parent = program;
            this.visit(expression);
        }
    };
    this.visitVariableDeclaration = function (decl) {
        for (var i = 0; i < decl.declarations.length; i++) {
            var declaration = decl.declarations[i];
            declaration.parent = decl;
            this.visit(declaration);
        }
    };
    this.visitVariableDeclarator = function (variable) {
        if (variable.id !== null) {
            variable.id.parent = variable;
            this.visit(variable.id);
        }
        if (variable.init !== null) {
            variable.init.parent = variable;
            this.visit(variable.init);
        }
    };
    this.visitIdentifier = function (id) {
        // console.log(id.name);
    };
    this.visitBinaryExpression = function (expression) {
        if (expression.left !== null) {
            expression.left.parent = expression;
            this.visit(expression.left);
        }
        
        if (expression.right !== null) {
            expression.right.parent = expression;
            this.visit(expression.right);
        }
    };
    this.visitLiteral = function (literal) {
        // console.log(literal.value);
    };
    this.visitFunctionExpression = function (fx) {
        if (fx.id !== null) {
            fx.id.parent = fx;
            this.visit(fx.id);
        }
        for(var i = 0;i<fx.params.length;i++){
            var param = fx.params[i];
            param.parent = fx;
            this.visit(param);
        }
        // The 'defaults' property was removed in newer esprima versions
        if (fx.defaults) {
            for(var i = 0;i<fx.defaults.length;i++){
                var def = fx.defaults[i];
                def.parent = fx;
                this.visit(def);
            }
        }
        
        if (fx.body !== null) {
            fx.body.parent = fx;
            this.visit(fx.body);
        }
        //generator
        // expression
    };
    this.visitBlockStatement = function(block) {
        for(var i=0;i<block.body.length;i++) {
            var e = block.body[i];
            e.parent = block;
            this.visit(e);
        }
    };
    this.visitAssignmentExpression = function(ex) {
        this.visitBinaryExpression(ex);
    };
    this.visitMemberExpression = function(member) {
        if (member.object !== null) {
            member.object.parent = member;
            this.visit(member.object);
        }
        
        if (member.property !== null) {
            member.property.parent = member;
            this.visit(member.property);
        }
    };
    this.visitExpressionStatement = function(ex) {
        if (ex.expression !== null) {
            ex.expression.parent = ex;
            this.visit(ex.expression);
        }
    };
    this.visitObjectExpression = function(ex) {
        for(var i=0;i<ex.properties.length;i++) {
            var property = ex.properties[i];
            property.parent = ex;
            this.visit(property);
        }
    };
    this.visitProperty = function(prop) {
        if (prop.key !== null) {
            prop.key.parent = prop;
            this.visit(prop.key);
        }
        
        if (prop.value) {
            prop.value.parent = prop;
            this.visit(prop.value);
        }
    };
    this.visitNewExpression = function(ex) {
        if (ex.callee !== null) {
            ex.callee.parent = ex;
            this.visit(ex.callee);
        }
        
        for(var i=0;i<ex.arguments.length;i++) {
            var arg = ex.arguments[i];
            arg.parent = ex;
            this.visit(arg);
        }
    };
    this.visitCallExpression = function(call) {
        this.visitNewExpression(call);
    };
    this.evaluateFilters = function(expression) {
        // Check all selector groups (OR logic)
        for (var g = 0; g < this.selectorGroups.length; g++) {
            var selectors = this.selectorGroups[g];
            if (this.matchesSelectorSequence(expression, selectors)) {
                // Get the last selector to check for property selectors
                var lastSelector = selectors[selectors.length - 1];
                
                if (lastSelector.propertySelectors && lastSelector.propertySelectors.length > 0) {
                    // Apply property selectors
                    var currentResult = expression;
                    for (var i = 0; i < lastSelector.propertySelectors.length; i++) {
                        var propFilter = lastSelector.propertySelectors[i];
                        if (currentResult[propFilter]) {
                            currentResult = currentResult[propFilter];
                        }
                    }
                    this.results.push(currentResult);
                } else {
                    this.results.push(expression);
                }
                return; // Match found, no need to check other groups
            }
        }
    };
    
    this.matchesSelectorSequence = function(expression, selectors) {
        if (selectors.length === 0) return false;
        
        // Start from the last selector and work backwards
        var currentExpression = expression;
        
        for (var i = selectors.length - 1; i >= 0; i--) {
            var selector = selectors[i];
            
            if (!currentExpression) return false;
            
            // Test current expression against selector
            if (!selector.test(currentExpression)) {
                return false;
            }
            
            // Mark matched filter for legacy support
            currentExpression.matchedFilter = selector;
            
            // Move to next expression based on combinator
            if (i > 0) {
                var prevCombinator = selectors[i].combinator;
                
                switch (prevCombinator) {
                    case ' ':
                        // IMPORTANT: Space combinator behavior differs from CSS!
                        // In CSS: space means "descendant at any level"
                        // In Foresta: space means "consecutive parent chain"
                        // Example: "Program VariableDeclaration VariableDeclarator" requires:
                        //   - VariableDeclarator whose parent is VariableDeclaration
                        //   - whose parent is Program
                        // This matches the original Foresta.js behavior for backward compatibility
                        currentExpression = currentExpression.parent;
                        break;
                    case '>':
                        // Direct child: parent must match
                        currentExpression = currentExpression.parent;
                        break;
                    case '+':
                        // Adjacent sibling: previous sibling must match
                        currentExpression = this.getPreviousSibling(currentExpression);
                        break;
                    case '~':
                        // General sibling: any previous sibling must match
                        currentExpression = this.findPreviousSibling(currentExpression, selectors[i - 1]);
                        break;
                    default:
                        currentExpression = currentExpression.parent;
                }
            }
        }
        
        return true;
    };
    
    this.findAncestor = function(expression, selector) {
        var current = expression.parent;
        while (current) {
            if (selector.test(current)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    };
    
    this.getPreviousSibling = function(expression) {
        var siblings = this.getSiblings(expression);
        var index = siblings.indexOf(expression);
        if (index > 0) {
            return siblings[index - 1];
        }
        return null;
    };
    
    this.findPreviousSibling = function(expression, selector) {
        var siblings = this.getSiblings(expression);
        var index = siblings.indexOf(expression);
        
        for (var i = index - 1; i >= 0; i--) {
            if (selector.test(siblings[i])) {
                return siblings[i];
            }
        }
        return null;
    },
    this.visit = function (tgt) {
        if (tgt === null) return;
        
        this.evaluateFilters(tgt);

        switch (tgt.type) {
            case "Program":
                this.visitProgram(tgt);
                break;
            case "VariableDeclaration":
                this.visitVariableDeclaration(tgt);
                break;
            case "VariableDeclarator":
                this.visitVariableDeclarator(tgt);
                break;
            case "Identifier":
                this.visitIdentifier(tgt);
                break;
            case "BinaryExpression":
                this.visitBinaryExpression(tgt);
                break;
            case "Literal":
                this.visitLiteral(tgt);
                break;
            case "FunctionExpression":
                this.visitFunctionExpression(tgt);
                break;
            case "BlockStatement":
                this.visitBlockStatement(tgt);
                break;
            case "AssignmentExpression":
                this.visitAssignmentExpression(tgt);
                break;
            case "MemberExpression":
                this.visitMemberExpression(tgt);
                break;
            case "ExpressionStatement":
                this.visitExpressionStatement(tgt);
                break;
            case "ObjectExpression":
                this.visitObjectExpression(tgt);
                break;
            case "Property":
                this.visitProperty(tgt);
                break;
            case "NewExpression":
                this.visitNewExpression(tgt);
                break;
            case "CallExpression":
                this.visitCallExpression(tgt);
                break;
            case "FunctionDeclaration":
                this.visitFunctionDeclaration(tgt);
                break;
            case "IfStatement":
                this.visitIfStatement(tgt);
                break;
            case "ReturnStatement":
                this.visitReturnStatement(tgt);
                break;
            case "SwitchStatement":
                this.visitSwitchStatement(tgt);
                break;
            case "SwitchCase":
                this.visitSwitchCase(tgt);
                break;
            case "ExportNamedDeclaration":
                this.visitExportNamedDeclaration(tgt);
                break;
            case "ExportDefaultDeclaration":
                this.visitExportDefaultDeclaration(tgt);
                break;
            case "ArrayExpression":
                this.visitArrayExpression(tgt);
                break;
            case "ArrowFunctionExpression":
                this.visitArrowFunctionExpression(tgt);
                break;
            case "AwaitExpression":
                this.visitAwaitExpression(tgt);
                break;
        }
    };
    
    this.visitFunctionDeclaration = function(decl) {
        if (decl.id !== null) {
            decl.id.parent = decl;
            this.visit(decl.id);
        }
        for (var i = 0; i < decl.params.length; i++) {
            var param = decl.params[i];
            param.parent = decl;
            this.visit(param);
        }
        if (decl.body !== null) {
            decl.body.parent = decl;
            this.visit(decl.body);
        }
    };
    
    this.visitIfStatement = function(stmt) {
        if (stmt.test !== null) {
            stmt.test.parent = stmt;
            this.visit(stmt.test);
        }
        if (stmt.consequent !== null) {
            stmt.consequent.parent = stmt;
            this.visit(stmt.consequent);
        }
        if (stmt.alternate !== null) {
            stmt.alternate.parent = stmt;
            this.visit(stmt.alternate);
        }
    };
    
    this.visitReturnStatement = function(stmt) {
        if (stmt.argument !== null) {
            stmt.argument.parent = stmt;
            this.visit(stmt.argument);
        }
    };
    
    this.visitSwitchStatement = function(stmt) {
        if (stmt.discriminant !== null) {
            stmt.discriminant.parent = stmt;
            this.visit(stmt.discriminant);
        }
        for (var i = 0; i < stmt.cases.length; i++) {
            var caseNode = stmt.cases[i];
            caseNode.parent = stmt;
            this.visit(caseNode);
        }
    };
    
    this.visitSwitchCase = function(caseNode) {
        if (caseNode.test !== null) {
            caseNode.test.parent = caseNode;
            this.visit(caseNode.test);
        }
        for (var i = 0; i < caseNode.consequent.length; i++) {
            var stmt = caseNode.consequent[i];
            stmt.parent = caseNode;
            this.visit(stmt);
        }
    };
    
    this.visitExportNamedDeclaration = function(exp) {
        if (exp.declaration !== null) {
            exp.declaration.parent = exp;
            this.visit(exp.declaration);
        }
        if (exp.specifiers) {
            for (var i = 0; i < exp.specifiers.length; i++) {
                var spec = exp.specifiers[i];
                spec.parent = exp;
                this.visit(spec);
            }
        }
    };
    
    this.visitExportDefaultDeclaration = function(exp) {
        if (exp.declaration !== null) {
            exp.declaration.parent = exp;
            this.visit(exp.declaration);
        }
    };
    
    this.visitArrayExpression = function(arr) {
        for (var i = 0; i < arr.elements.length; i++) {
            var elem = arr.elements[i];
            if (elem !== null) {
                elem.parent = arr;
                this.visit(elem);
            }
        }
    };
    
    this.visitArrowFunctionExpression = function(fx) {
        for (var i = 0; i < fx.params.length; i++) {
            var param = fx.params[i];
            param.parent = fx;
            this.visit(param);
        }
        if (fx.body !== null) {
            fx.body.parent = fx;
            this.visit(fx.body);
        }
    };
    
    this.visitAwaitExpression = function(expr) {
        if (expr.argument !== null) {
            expr.argument.parent = expr;
            this.visit(expr.argument);
        }
    }
}

// Static helper methods to abstract esprima dependency
foresta.parse = function(code, options) {
    // Try to require esprima if available
    var esprima;
    if (typeof require !== 'undefined') {
        try {
            esprima = require('esprima');
        } catch (e) {
            throw new Error('esprima is required for parsing. Install it with: npm install esprima');
        }
    } else if (typeof window !== 'undefined' && window.esprima) {
        esprima = window.esprima;
    } else {
        throw new Error('esprima is not available. Please include it in your project.');
    }
    
    // Parse the code
    var parseMethod = (options && options.sourceType === 'module') ? 'parseModule' : 'parseScript';
    return esprima[parseMethod](code, options);
};

foresta.query = function(code, selector, options) {
    // Parse the code
    var ast = foresta.parse(code, options);
    
    // Create query and execute
    var query = new foresta(selector);
    query.visit(ast);
    
    return query.results;
};

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = foresta;
}

// Export for browser global usage
if (typeof window !== 'undefined') {
    window.foresta = foresta;
}