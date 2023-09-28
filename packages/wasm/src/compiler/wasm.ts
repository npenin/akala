import ts, { Program, Node } from "typescript";
import { Visitor, VisitorMap } from "./ts.js";

export class Wasm extends VisitorMap
{
    checker: ts.TypeChecker;
    start(program: Program): Promise<void>
    {
        this.checker = program.getTypeChecker();

        return Promise.resolve();
    }

    constructor()
    {
        super();
        this.map = {
            [ts.SyntaxKind.BinaryExpression]: (node) =>
            {
                if (ts.isBinaryExpression(node))
                {

                }
            }
        }
    }

}