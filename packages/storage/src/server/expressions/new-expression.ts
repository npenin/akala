/* eslint-disable @typescript-eslint/no-explicit-any */

import { Expression } from './expression';
import { ExpressionType } from './expression-type';
import { MemberExpression } from './member-expression';
import { ExpressionVisitor } from './expression-visitor';

export class NewExpression<T> extends Expression
{
    public get type(): ExpressionType.NewExpression { return ExpressionType.NewExpression; }
    public readonly init: MemberExpression<T, any, any>[];
    constructor(...init: MemberExpression<T, any, any>[])
    {
        super();
        this.init = init;
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitNew(this);
    }
}