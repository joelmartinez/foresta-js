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
        //if (id.name === this.query) this.results.push(id.parent);
        console.log(id.name);
    };
    this.visitBinaryExpression = function (expression) {
        expression.left.parent = expression;
        expression.right.parent = expression;

        this.visit(expression.left);
        //console.log(expression.operator);
        this.visit(expression.right);
    };
    this.visitLiteral = function (literal) {
        //console.log(literal.value);
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
        }
    }
}