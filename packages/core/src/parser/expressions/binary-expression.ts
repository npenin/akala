import { BinaryOperator } from './binary-operator';
import { Expression, Expressions, StrictExpressions } from './expression';
import { ExpressionType } from './expression-type';
import { ExpressionVisitor } from './expression-visitor';


export class BinaryExpression<T extends Expressions = StrictExpressions> extends Expression
{
    public get type(): ExpressionType.BinaryExpression { return ExpressionType.BinaryExpression; }
    constructor(public readonly left: T, public readonly operator: BinaryOperator, public readonly right: T)
    {
        super();

    }

    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitBinary(this);
    }
}