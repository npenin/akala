/* eslint-disable @typescript-eslint/no-explicit-any */

import { Expression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { MemberExpression } from './member-expression.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

export class NewExpression<T> extends Expression
{
    public get type(): ExpressionType.NewExpression { return ExpressionType.NewExpression; }
    public readonly init: MemberExpression<T, any, any>[];
    public newType: '{' | '[' = '{';

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