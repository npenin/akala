import { Expression, TypedExpression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { ConstantExpression } from './constant-expression.js';
import { ParameterExpression } from './parameter-expression.js';
import { ExpressionVisitor } from './expression-visitor.js';

export class MemberExpression<T, TMember extends keyof T, U extends T[TMember]> extends Expression
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