import { Expression, TypedExpression } from './expression';
import { ExpressionType } from './expression-type';
import { ExpressionVisitor } from './expression-visitor';
import { IVisitable } from './visitable';

export class MemberExpression<T, TMember extends keyof T, U extends T[TMember]> extends Expression
    implements IVisitable<ExpressionVisitor, Promise<MemberExpression<T, TMember, U>>>
{
    public get type(): ExpressionType.MemberExpression { return ExpressionType.MemberExpression; }
    constructor(public readonly source: TypedExpression<T>, public readonly member: TMember)
    {
        super();
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitMember(this);
    }
}