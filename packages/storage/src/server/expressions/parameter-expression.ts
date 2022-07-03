import { Expression } from './expression';
import { ExpressionType } from './expression-type';
import { ExpressionVisitor } from './expression-visitor';

//eslint-disable-next-line @typescript-eslint/no-unused-vars
export class ParameterExpression<T> extends Expression
{
    public get type(): ExpressionType.ParameterExpression { return ExpressionType.ParameterExpression; }
    constructor(public readonly name: string = '')
    {
        super();
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitParameter(this);
    }
}