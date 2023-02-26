import { Expression, TypedExpression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { ExpressionVisitor } from './expression-visitor.js';
import { IVisitable } from './visitable.js';

export class MemberExpression<T, TMember extends keyof T, U extends T[TMember]> extends Expression
    implements IVisitable<ExpressionVisitor, Promise<TypedExpression<U>>>
{
    public get type(): ExpressionType.MemberExpression { return ExpressionType.MemberExpression; }
    constructor(public readonly source: TypedExpression<T>, public readonly member: TMember)
    {
        super();
    }
    public accept(visitor: ExpressionVisitor): Promise<TypedExpression<U>>
    {
        return visitor.visitMember(this) as Promise<TypedExpression<U>>;
    }
}