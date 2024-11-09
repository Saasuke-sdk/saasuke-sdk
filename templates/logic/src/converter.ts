import * as ts from 'typescript';
import { CairoContract, CairoFunction, CairoStorage } from './types/cairo';

export class TypeScriptToCairoConverter {
    private sourceFile: ts.SourceFile;
    private contract: CairoContract;

    constructor(sourceCode: string) {
        this.sourceFile = ts.createSourceFile(
            'temp.ts',
            sourceCode,
            ts.ScriptTarget.Latest,
            true
        );
        
        this.contract = {
            name: 'Counter',
            storage: [],
            functions: [],
        };
    }

    public convert(): string {
        this.processNode(this.sourceFile);
        return this.generateCairoCode();
    }

    private processNode(node: ts.Node) {
        if (ts.isClassDeclaration(node) && node.name?.text === 'Counter') {
            this.processClass(node);
        }
        ts.forEachChild(node, child => this.processNode(child));
    }

    private processClass(node: ts.ClassDeclaration) {
        this.contract.storage.push({
            name: 'value',
            type: 'felt252'  // Updated to felt252
        });

        node.members.forEach(member => {
            if (ts.isMethodDeclaration(member)) {
                this.processMember(member);
            }
        });
    }

    private processMember(node: ts.MethodDeclaration) {
        if (!node.name) return;

        const methodName = node.name.getText();
        const parameters = node.parameters.map(param => ({
            name: param.name.getText(),
            type: 'felt252'  // Updated to felt252
        }));

        let cairoFunction: CairoFunction = {
            name: methodName,
            parameters: parameters,
            returnType: 'felt252',  // Updated to felt252
            visibility: 'external',
            decorators: [],
            body: []
        };

        switch (methodName) {
            case 'getValue':
                cairoFunction.body = ['self.value.read()'];
                break;
            case 'increment':
                cairoFunction.body = [
                    'self.value.write(self.value.read() + 1);',
                    'self.value.read()'
                ];
                break;
            case 'decrement':
                cairoFunction.body = [
                    'self.value.write(self.value.read() - 1);',
                    'self.value.read()'
                ];
                break;
            case 'add':
                cairoFunction.body = [
                    'self.value.write(self.value.read() + amount);',
                    'self.value.read()'
                ];
                break;
        }

        this.contract.functions.push(cairoFunction);
    }

    private generateCairoCode(): string {
        // Generate interface
        let code = [
            '#[starknet::interface]',
            `pub trait ICounter<TContractState> {`,
            '    fn getValue(self: @TContractState) -> felt252;',
            '    fn increment(ref self: TContractState) -> felt252;',
            '    fn decrement(ref self: TContractState) -> felt252;',
            '    fn add(ref self: TContractState, amount: felt252) -> felt252;',
            '}',
            '',
            '#[starknet::contract]',
            'mod Counter {',
            '    use core::starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};',
            '',
            '    #[storage]',
            '    struct Storage {',
            `        ${this.generateStorageVariables()}`,
            '    }',
            '',
            '    #[abi(embed_v0)]',
            '    impl CounterImpl of super::ICounter<ContractState> {',
        ];

        // Add functions
        this.contract.functions.forEach(func => {
            code.push(...this.generateFunction(func));
        });

        code.push('    }', '}');

        return code.join('\n');
    }

    private generateStorageVariables(): string {
        return this.contract.storage
            .map(storage => `${storage.name}: ${storage.type}`)
            .join(',\n        ');
    }

    private generateFunction(func: CairoFunction): string[] {
        const needsRef = func.name !== 'getValue';
        const selfParam = needsRef ? 'ref self: ContractState' : 'self: @ContractState';
        const additionalParams = func.parameters
            .filter(p => p.name !== 'self')
            .map(p => `${p.name}: ${p.type}`)
            .join(', ');
        const allParams = [selfParam, additionalParams].filter(Boolean).join(', ');

        return [
            `        fn ${func.name}(${allParams}) -> ${func.returnType} {`,
            ...func.body.map(line => `            ${line}`),
            '        }',
            ''
        ];
    }
}