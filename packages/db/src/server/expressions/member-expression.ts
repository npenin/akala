import { Expression, TypedExpression } from "./expression";
import { ExpressionType } from "./expression-type";
import { ConstantExpression } from "./constant-expression";
import { ParameterExpression } from "./parameter-expression";
import { ExpressionVisitor } from "./expression-visitor";

export class MemberExpression<T, TMember extends keyof T, U extends T[TMember]> extends Expression
{
    public get type(): ExpressionType.MemberExpression { return ExpressionType.MemberExpression; }
    constructor(public readonly source: TypedExpression<T>, public readonly member: TMember)
    {
        super();
    }
    public accept(visitor:ExpressionVisitor)
    {
        return visitor.visitMember(this);
    }
}