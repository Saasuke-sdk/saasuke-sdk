import * as ts from 'typescript';

interface CairoType {
    name: string;
    cairoType: string;
}

interface CairoParameter {
    name: string;
    type: string;
}

interface CairoFunction {
    name: string;
    parameters: CairoParameter[];
    returnType: string;
    visibility: 'external' | 'internal';
    body: string[];
    isView: boolean;
}

interface CairoStorage {
    name: string;
    type: string;
    initialValue?: string;
}

interface CairoContract {
    name: string;
    storage: CairoStorage[];
    functions: CairoFunction[];
    constructorParams: CairoParameter[];
    constructorBody: string[];
}


export class TypeScriptToCairoConverter {
    private sourceFile: ts.SourceFile;
    private contract: CairoContract;
    private typeMap: Map<string, string>;

    constructor(sourceCode: string) {
        this.sourceFile = ts.createSourceFile(
            'temp.ts',
            sourceCode,
            ts.ScriptTarget.Latest,
            true
        );
        
        this.contract = {
            name: '',
            storage: [],
            functions: [],
            constructorParams: [],
            constructorBody: []
        };

        this.typeMap = new Map([
            ['number', 'felt252'],
            ['string', 'felt252'],
            ['boolean', 'bool'],
            ['bigint', 'u256'],
            // Add more types if needed
        ]);
    }

    private processConstructor(node: ts.ConstructorDeclaration) {
        // Process constructor parameters
        this.contract.constructorParams = node.parameters.map(param => ({
            name: param.name.getText(),
            type: param.type ? this.convertType(param.type) : 'felt252'
        }));
    
        // Helper function to remove 'n' suffix from bigint literals
        const removeBigIntSuffix = (value: string): string => {
            return value.replace(/(\d+)n/g, '$1'); // Remove 'n' from bigint literals
        };
    
        // Process constructor body for initial values
        if (node.body) {
            node.body.statements.forEach(statement => {
                if (ts.isExpressionStatement(statement)) {
                    const expr = statement.expression;
                    if (ts.isBinaryExpression(expr) && 
                        ts.isPropertyAccessExpression(expr.left) &&
                        expr.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
                        
                        const varName = expr.left.name.getText();
                        let initialValue = expr.right.getText();
                        
                        // Remove 'n' suffix from bigint literals
                        initialValue = removeBigIntSuffix(initialValue);
                        
                        // Update storage variable with initial value
                        const storageVar = this.contract.storage.find(s => s.name === varName);
                        if (storageVar) {
                            storageVar.initialValue = initialValue;
                        }
                        
                        // Add to constructor body
                        this.contract.constructorBody.push(
                            `self.${varName}.write(${initialValue});`
                        );
                    }
                }
            });
        }
    }


    private hasViewDecorator(node: ts.MethodDeclaration): boolean {
        const decorators = ts.getDecorators(node);
        if (!decorators || decorators.length === 0) return false;
        
        return decorators.some((decorator: ts.Decorator) => {
            const expr = decorator.expression;
            return ts.isIdentifier(expr) && expr.text === 'view';
        });
    }

    private hasExternalDecorator(node: ts.MethodDeclaration): boolean {
        const decorators = ts.getDecorators(node);
        if (!decorators || decorators.length === 0) return false;
        
        return decorators.some((decorator: ts.Decorator) => {
            const expr = decorator.expression;
            return ts.isIdentifier(expr) && expr.text === 'external';
        });
    }

    private processNode(node: ts.Node) {
        if (ts.isClassDeclaration(node)) {
            this.contract.name = node.name?.text || 'Contract';
            this.processClass(node);
        }
        ts.forEachChild(node, child => this.processNode(child));
    }

    private processClass(node: ts.ClassDeclaration) {
        node.members.forEach(member => {
            if (ts.isPropertyDeclaration(member)) {
                const name = member.name.getText();
                const type = member.type ? this.convertType(member.type) : 'felt252';
                this.contract.storage.push({ name, type });
            } else if (ts.isConstructorDeclaration(member)) {
                this.processConstructor(member);
            } else if (ts.isMethodDeclaration(member)) {
                this.processMember(member);
            }
        });
    }
    private processMember(node: ts.MethodDeclaration) {
        if (!node.name) return;
    
        const methodName = node.name.getText();
        const parameters = this.processParameters(node.parameters);
        const returnType = node.type ? this.convertType(node.type) : 'felt252';
        const isView = this.hasViewDecorator(node);
        const body = this.analyzeFunctionBody(node, isView);
    
        const cairoFunction: CairoFunction = {
            name: methodName,
            parameters,
            returnType,
            visibility: isView ? 'external' : 'external', // View functions are external in Cairo
            body,
            isView,
        };
    
        this.contract.functions.push(cairoFunction);
    }
    

    private getReturnVariable(node: ts.Block): string | undefined {
        let returnVar: string | undefined;
        
        const visitor = (node: ts.Node) => {
            if (ts.isReturnStatement(node)) {
                if (node.expression && ts.isPropertyAccessExpression(node.expression)) {
                    if (node.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
                        returnVar = node.expression.name.getText();
                    }
                }
            }
            ts.forEachChild(node, visitor);
        };
        
        visitor(node);
        return returnVar;
    }
    private findReturnExpression(node: ts.Block): string | undefined {
        const returnStmt = this.findReturnStatement(node);
        if (!returnStmt || !returnStmt.expression) return undefined;

        // Handle property access (this.x, this.y)
        if (ts.isPropertyAccessExpression(returnStmt.expression)) {
            const prop = returnStmt.expression.name.getText();
            return `self.${prop}.read()`;
        }

        // Handle binary expression (this.x , this.y)
        if (ts.isBinaryExpression(returnStmt.expression)) {
            if (ts.isPropertyAccessExpression(returnStmt.expression.left)) {
                const prop = returnStmt.expression.left.name.getText();
                return `self.${prop}.read()`;
            }
        }

        return undefined;
    }

    private findReturnStatement(node: ts.Block): ts.ReturnStatement | undefined {
        let returnStmt: ts.ReturnStatement | undefined;

        const visitor = (node: ts.Node) => {
            if (ts.isReturnStatement(node)) {
                returnStmt = node;
                return;
            }
            ts.forEachChild(node, visitor);
        };

        visitor(node);
        return returnStmt;
    }

    private analyzeFunctionBody(node: ts.MethodDeclaration, isView: boolean): string[] {
        if (!node.body) return [];
        const body: string[] = [];
    
        // Helper function to remove 'n' suffix from bigint literals
        const removeBigIntSuffix = (value: string): string => {
            return value.replace(/(\d+)n/g, '$1'); // Remove 'n' from bigint literals
        };
    
        // Handle variable declarations
        const variableDeclarations = this.extractVariableDeclarations(node.body);
        variableDeclarations.forEach(decl => {
            // Replace `this.x` with `self.x.read()`
            let initializer = decl.initializer.replace(/this\.(\w+)/g, 'self.$1.read()');
            // Remove 'n' suffix from bigint literals
            initializer = removeBigIntSuffix(initializer);
            body.push(`let ${decl.name} = ${initializer};`);
        });
    
        // Handle state modifications
        const modifications = this.extractStateModifications(node.body);
        modifications.forEach(mod => {
            if (mod.type === 'assignment') {
                // Replace `this.x = value` with `self.x.write(value)`
                let expression = mod.expression ? mod.expression.replace(/this\.(\w+)/g, 'self.$1.read()') : '';
                // Remove 'n' suffix from bigint literals
                expression = removeBigIntSuffix(expression);
                body.push(`self.${mod.variable}.write(${expression});`);
            } else if (mod.type === 'conditional') {
                // Replace `this.x` with `self.x.read()` in conditions
                let condition = mod.condition ? mod.condition.replace(/this\.(\w+)/g, 'self.$1.read()') : '';
                // Remove 'n' suffix from bigint literals
                condition = removeBigIntSuffix(condition);
                body.push(`if ${condition} {`);
                if (mod.body) {
                    mod.body.forEach(line => {
                        // Replace `this.x = value` with `self.x.write(value)`
                        let updatedLine = line.replace(/this\.(\w+)\s*=\s*(.+)/g, 'self.$1.write($2)');
                        // Remove 'n' suffix from bigint literals
                        updatedLine = removeBigIntSuffix(updatedLine);
                        body.push(`    ${updatedLine}`);
                    });
                }
                body.push(`}`);
            }
        });
    
        // Handle return statements
        const returnStmt = this.findReturnStatement(node.body);
        if (returnStmt && returnStmt.expression) {
            let returnExpr = returnStmt.expression.getText();
            // Replace `this.x` with `self.x.read()` in return statements
            returnExpr = returnExpr.replace(/this\.(\w+)/g, 'self.$1.read()');
            // Remove 'n' suffix from bigint literals
            returnExpr = removeBigIntSuffix(returnExpr);
            body.push(`return ${returnExpr};`);
        }
    
        return body;
    }

    private extractVariableDeclarations(node: ts.Node): Array<{ name: string, initializer: string }> {
        const declarations: Array<{ name: string, initializer: string }> = [];
    
        const visitor = (node: ts.Node) => {
            if (ts.isVariableDeclaration(node)) {
                const name = node.name.getText();
                const initializer = node.initializer ? node.initializer.getText() : '0';
                declarations.push({ name, initializer });
            }
            ts.forEachChild(node, visitor);
        };
    
        visitor(node);
        return declarations;
    }

    private findStateVariableAccess(node: ts.Node): string[] {
        const stateVars: string[] = [];
        const visitor = (node: ts.Node) => {
            if (ts.isPropertyAccessExpression(node) && 
                node.expression.kind === ts.SyntaxKind.ThisKeyword) {
                stateVars.push(node.name.getText());
            }
            ts.forEachChild(node, visitor);
        };
        visitor(node);
        return [...new Set(stateVars)];
    }

    private checkIfModifiesState(node: ts.Node): boolean {
        let modifiesState = false;
        const visitor = (node: ts.Node) => {
            if (ts.isBinaryExpression(node) && 
                ts.isPropertyAccessExpression(node.left) &&
                node.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
                modifiesState = true;
            }
            ts.forEachChild(node, visitor);
        };
        visitor(node);
        return modifiesState;
    }
    private extractStateModifications(node: ts.Node): Array<{ type: string, variable?: string, expression?: string, condition?: string, body?: string[] }> {
        const modifications: Array<{ type: string, variable?: string, expression?: string, condition?: string, body?: string[] }> = [];
    
        const visitor = (node: ts.Node) => {
            if (ts.isBinaryExpression(node)) {
                if (ts.isPropertyAccessExpression(node.left) &&
                    node.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
                    const variable = node.left.name.getText();
                    const expression = node.right.getText();
                    modifications.push({ type: 'assignment', variable, expression });
                }
            } else if (ts.isIfStatement(node)) {
                const condition = node.expression.getText();
                const body: string[] = [];
                if (node.thenStatement && ts.isBlock(node.thenStatement)) {
                    node.thenStatement.statements.forEach(statement => {
                        if (ts.isExpressionStatement(statement)) {
                            body.push(statement.expression.getText());
                        }
                    });
                }
                modifications.push({ type: 'conditional', condition, body });
            }
            ts.forEachChild(node, visitor);
        };
    
        visitor(node);
        return modifications;
    }

    private hasReturnStatement(node: ts.Node): boolean {
        let hasReturn = false;
        const visitor = (node: ts.Node) => {
            if (ts.isReturnStatement(node)) {
                hasReturn = true;
            }
            if (!hasReturn) {
                ts.forEachChild(node, visitor);
            }
        };
        visitor(node);
        return hasReturn;
    }

    private processParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): CairoParameter[] {
        return parameters.map(param => ({
            name: param.name.getText(),
            type: param.type ? this.convertType(param.type) : 'felt252'
        }));
    }

    private convertType(typeNode: ts.TypeNode): string {
        const typeText = typeNode.getText();
        return this.typeMap.get(typeText) || 'felt252';
    }

    public convert(): string {
        this.processNode(this.sourceFile);
        return this.generateCairoCode();
    }

   

   private generateCairoCode(): string {
        let code = [
            '#[starknet::interface]',
            `pub trait I${this.contract.name}<TContractState> {`,
            this.generateInterfaceFunctions(),
            '}',
            '',
            '#[starknet::contract]',
            `mod ${this.contract.name} {`,
            '    use core::starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};',
            '',
            '    #[storage]',
            '    struct Storage {',
            this.generateStorageVariables(),
            '    }',
            '',
            '    #[constructor]',
            '    fn constructor(',
            `        ref self: ContractState,`,
            `        ${this.contract.constructorParams.map(p => `${p.name}: ${p.type}`).join(', ')}`,
            '    ) {',
            this.contract.constructorBody.map(line => `        ${line}`).join('\n'),
            '    }',
            '',
            '    #[abi(embed_v0)]',
            `    impl ${this.contract.name}Impl of super::I${this.contract.name}<ContractState> {`,
            this.generateImplementationFunctions(),
            '    }',
            '}',
        ];

        return code.join('\n');
    }

    
    private convertRelationalExpression(expr: ts.BinaryExpression): string {
        const left = expr.left.getText();
        const right = expr.right.getText();
        const operator = expr.operatorToken.getText();
    
        // Map TypeScript operators to Cairo operators
        const operatorMap = new Map<string, string>([
            ['==', '=='],
            ['!=', '!='],
            ['<', '<'],
            ['>', '>'],
            ['<=', '<='],
            ['>=', '>='],
        ]);
    
        const cairoOperator = operatorMap.get(operator);
        if (!cairoOperator) {
            throw new Error(`Unsupported relational operator: ${operator}`);
        }
    
        return `${left} ${cairoOperator} ${right}`;
    }

    private extractRelationalExpressions(node: ts.Node): string[] {
        const expressions: string[] = [];
    
        const visitor = (node: ts.Node) => {
            if (ts.isBinaryExpression(node)) {
                const operator = node.operatorToken.getText();
                if (['==', '!=', '<', '>', '<=', '>='].includes(operator)) {
                    const cairoExpr = this.convertRelationalExpression(node);
                    expressions.push(cairoExpr);
                }
            }
            ts.forEachChild(node, visitor);
        };
    
        visitor(node);
        return expressions;
    }



    private generateStorageVariables(): string {
        return this.contract.storage
            .map(storage => `        ${storage.name}: ${storage.type}`)
            .join(',\n');
    }

    private generateInterfaceFunctions(): string {
        return this.contract.functions.map(func => {
            const params = func.parameters
                .map(p => `${p.name}: ${p.type}`)
                .join(', ');
            // For view functions use @TContractState, for others use ref
            const selfParam = func.isView ? 
                'self: @TContractState' : 
                'ref self: TContractState';
            const allParams = [selfParam, params].filter(Boolean).join(', ');
            return `    fn ${func.name}(${allParams}) -> ${func.returnType};`;
        }).join('\n');
    }

    private generateImplementationFunctions(): string {
        return this.contract.functions.map(func => {
            const params = func.parameters
                .map(p => `${p.name}: ${p.type}`)
                .join(', ');
            const selfParam = func.isView ? 
                'self: @ContractState' : 
                'ref self: ContractState';
            const allParams = [selfParam, params].filter(Boolean).join(', ');
            
            return [
                `        fn ${func.name}(${allParams}) -> ${func.returnType} {`,
                ...func.body.map(line => `            ${line}`),
                '        }'
            ].join('\n');
        }).join('\n\n');
    }


}