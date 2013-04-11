function foresta(query) {
    this.query = query;

    // parse out the query
    var parts = this.query.split(" ");
    this.filters = new Array();

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.length = 0 || part === " ") continue;

        var filter = null;
        if (part.substring(0, 1) === "#") {
            // identifier
            filter = {
                value: part.substring(1, part.length),
                test: function (expression) {
                    return expression.type === "Identifier" && expression.name === this.value;
                }
            };
        } else if (part === "*") {
            // wildcard ... match anything
            filter = {
                test: function (expression) {
                    return true
                }
            };
        } else {
            // this is probably just a bare expression type filter
            filter = {
                value: part,
                test: function (expression) {
                    return expression.type === this.value;
                }
            };
        }

        if (filter != null) this.filters.push(filter);
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
        variable.id.parent = variable;
        variable.init.parent = variable;
        this.visit(variable.id);
        this.visit(variable.init);
    };
    this.visitIdentifier = function (id) {
        // console.log(id.name);
    };
    this.visitBinaryExpression = function (expression) {
        expression.left.parent = expression;
        expression.right.parent = expression;

        this.visit(expression.left);
        this.visit(expression.right);
    };
    this.visitLiteral = function (literal) {
        // console.log(literal.value);
    };
    this.visitFunctionExpression = function (fx) {
        if (fx.id != null) {
            fx.id.parent = fx;
            this.visit(fx.id);
        }
        for(var i = 0;i<fx.params.length;i++){
            var param = fx.params[i];
            param.parent = fx;
            this.visit(param);
        }
        for(var i = 0;i<fx.defaults.length;i++){
            var def = fx.defaults[i];
            def.parent = fx;
            this.visit(def);
        }
        fx.body.parent = fx;
        this.visit(fx.body);
        //generator
        // expression
    };
    this.visitBlockStatement = function(block) {
        for(var i=0;block.body.length;i++) {
            var e = block.body[i];
            e.parent = block;
            this.visit(e);
        }
    };
    this.visitAssignmentExpression = function(ex) {
        this.visitBinaryExpression(ex);
    };
    this.visitMemberExpression = function(member) {
        member.object.parent = member;
        member.property.parent = member;
        this.visit(member.object);
        this.visit(member.property);
    };
    this.visitExpressionStatement = function(ex) {
        ex.expression.parent = ex;
        this.visit(ex.expression);
    };
    this.visitObjectExpression = function(ex) {
        for(var i=0;i<ex.properties.length;i++) {
            var property = ex.properties[i];
            property.parent = ex;
            this.visit(property);
        }
    };
    this.visitProperty = function(prop) {
        prop.key.parent = prop;
        prop.value.parent = prop;
        this.visit(prop.key);
        this.visit(prop.value);
    };
    this.visitNewExpression = function(ex) {
        ex.callee.parent = ex;
        this.visit(ex.callee);
        for(var i=0;i<ex.arguments.length;i++) {
            var arg = ex.arguments[i];
            arg.parent = ex;
            this.visit(arg);
        }
    };
    this.evaluateFilters = function(tgt) {
        var filterMatched = true;
        var context = tgt;
        for (var i = this.filters.length - 1; i >= 0; i--) {
            var filter = this.filters[i];
            if (context && filter.test(context)) {
                // move up the chain
                context = context.parent;
            } else {
                filterMatched = false;
                break;
            }
        }

        if (filterMatched) {
            this.results.push(tgt);
        }  
    },
    this.visit = function (tgt) {
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
        }
    }
}