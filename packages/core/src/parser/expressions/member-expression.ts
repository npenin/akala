import { Expression, TypedExpression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';
import { IVisitable } from './visitable.js';

export class MemberExpression<T, TMember extends keyof T, U extends T[TMember]> extends Expression
    implements IVisitable<ExpressionVisitor, TypedExpression<U>>
{
    public get type(): ExpressionType.MemberExpression { return ExpressionType.MemberExpression; }
    public $$length: number;

    constructor(public readonly source: TypedExpression<T>, public readonly member: TypedExpression<TMember>, public optional: boolean)
    {
        super();
    }
    public accept(visitor: ExpressionVisitor): TypedExpression<U>
    {
        return visitor.visitMember(this) as TypedExpression<U>;
    }
}