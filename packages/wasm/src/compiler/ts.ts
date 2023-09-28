import * as ts from "typescript";
import * as fs from "fs";

/** Generate documentation for all classes in a set of .ts files */
class Walker
{
    visitors: Visitor[];
    constructor(fileNames: string[], options: ts.CompilerOptions)
    {
        // Build a program using the set of root file names in fileNames
        this.program = ts.createProgram(fileNames, options);
    }

    program: ts.Program;
    map: Partial<Record<ts.SyntaxKind, Visitor>> = {};


    public register(visitor, nodeKinds: ts.SyntaxKind[])
    {
        this.visitors.push(visitor);
        nodeKinds.forEach(k => this.map[k] = visitor);
    }


    public async process()
    {
        await Promise.all(this.visitors.map(v => v.start(this.program)));
        for (const sourceFile of this.program.getSourceFiles())
        {
            if (!sourceFile.isDeclarationFile)
            {
                // Walk the tree to search for classes
                ts.forEachChild(sourceFile, this.visit.bind(this));
            }
        }
    }

    public visit(node: ts.Node)
    {
        if (node.kind in this.map)
            this.map[node.kind].visit(node);
        ts.forEachChild(node, this.visit.bind(this));
    }
}

export interface Visitor
{
    register(walker: Walker): Promise<void>;
    start(program: ts.Program): Promise<void>;
    visit(node: ts.Node);
}

export abstract class VisitorMap implements Visitor
{
    protected map: Partial<Record<ts.SyntaxKind, (node: ts.Node) => void>>;

    register(walker: Walker): Promise<void>
    {
        walker.register(this, Object.keys(this.map) as unknown as ts.SyntaxKind[]);
        return Promise.resolve();
    }
    abstract start(program: ts.Program): Promise<void>;
    visit(node: ts.Node)
    {
        this.map[node.kind] && this.map[node.kind](node);
    }
}

// // Get the checker, we will use it to find more about classes
// let checker = program.getTypeChecker();

// // Visit every sourceFile in the program
// for (const sourceFile of program.getSourceFiles())
// {
//     if (!sourceFile.isDeclarationFile)
//     {
//         // Walk the tree to search for classes
//         ts.forEachChild(sourceFile, visit);
//     }
// }

// // print out the doc
// fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));

// return;

    // /** visit nodes finding exported classes */
    // function visit(node: ts.Node)
    // {
    //     switch(node.kind)
    //     {
    //         case ts.SyntaxKind.VariableDeclaration:

    //     }
    //     // Only consider exported nodes
    //     if (!isNodeExported(node))
    //     {
    //         return;
    //     }

    //     if (ts.isClassDeclaration(node) && node.name)
    //     {
    //         // This is a top level class, get its symbol
    //         let symbol = checker.getSymbolAtLocation(node.name);
    //         if (symbol)
    //         {
    //             output.push(serializeClass(symbol));
    //         }
    //         // No need to walk any further, class expressions/inner declarations
    //         // cannot be exported
    //     } else if (ts.isModuleDeclaration(node))
    //     {
    //         // This is a namespace, visit its children
    //         ts.forEachChild(node, visit);
    //     }
    // }

    // /** Serialize a symbol into a json object */
    // function serializeSymbol(symbol: ts.Symbol): DocEntry
    // {
    //     return {
    //         name: symbol.getName(),
    //         documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
    //         type: checker.typeToString(
    //             checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
    //         )
    //     };
    // }

    // /** Serialize a class symbol information */
    // function serializeClass(symbol: ts.Symbol)
    // {
    //     let details = serializeSymbol(symbol);

    //     // Get the construct signatures
    //     let constructorType = checker.getTypeOfSymbolAtLocation(
    //         symbol,
    //         symbol.valueDeclaration!
    //     );
    //     details.constructors = constructorType
    //         .getConstructSignatures()
    //         .map(serializeSignature);
    //     return details;
    // }

    // /** Serialize a signature (call or construct) */
    // function serializeSignature(signature: ts.Signature)
    // {
    //     return {
    //         parameters: signature.parameters.map(serializeSymbol),
    //         returnType: checker.typeToString(signature.getReturnType()),
    //         documentation: ts.displayPartsToString(signature.getDocumentationComment(checker))
    //     };
    // }

    // /** True if this is visible outside this file, false otherwise */
    // function isNodeExported(node: ts.Node): boolean
    // {
    //     return (
    //         (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
    //         (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    //     );
    // }
// }

// generateDocumentation(process.argv.slice(2), {
//     target: ts.ScriptTarget.ES5,
//     module: ts.ModuleKind.CommonJS
// });