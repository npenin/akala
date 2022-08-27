import { Expression, TypedExpression, Expressions, StrictExpressions } from './expression';
import { ExpressionType } from './expression-type';
import { ExpressionVisitor } from './expression-visitor';


export class CallExpression<T, TMethod extends keyof T> extends Expression
{
    public get type(): ExpressionType.CallExpression { return ExpressionType.CallExpression; }
    public readonly arguments: Expressions[];
    constructor(public readonly source: TypedExpression<T>, public readonly method: TMethod, args: StrictExpressions[])
    {
        super();
        this.arguments = args;
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitCall(this);
    }
}