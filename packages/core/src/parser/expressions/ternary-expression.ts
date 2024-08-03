import { TernaryOperator } from './ternary-operator.js';
import { Expression, Expressions, StrictExpressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';


export class TernaryExpression<T extends Expressions = StrictExpressions> extends Expression
{
    public get type(): ExpressionType.TernaryExpression { return ExpressionType.TernaryExpression; }
    constructor(public readonly first: T, public readonly operator: TernaryOperator, public readonly second: T, public readonly third: T)
    {
        super();

    }

    public accept(visitor: ExpressionVisitor): TernaryExpression<Expressions>
    {
        return visitor.visitTernary(this);
    }
}