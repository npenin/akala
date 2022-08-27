import { Expression, TypedExpression } from './expression';
import { ExpressionType } from './expression-type';
import { ExpressionVisitor } from './expression-visitor';
import { IVisitable } from './visitable';

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