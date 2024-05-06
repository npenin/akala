import { isPromiseLike } from '../promiseHelpers.js';
import { ConstantExpression } from '../parser/expressions/constant-expression.js';
import { ExpressionVisitor } from '../parser/expressions/expression-visitor.js';
import { Expressions, StrictExpressions, TypedExpression } from '../parser/expressions/expression.js';
import { MemberExpression } from '../parser/expressions/member-expression.js';
import { ExpressionsWithLength } from '../parser/parser.js';
import { Injector } from './shared.js';


export class InjectorEvaluator extends ExpressionVisitor
{
    constructor(private injector: Injector)
    {
        super();
    }

    private result: unknown;

    public eval<T>(expression: ExpressionsWithLength): T
    {
        // console.log(expression);
        this.result = this.injector;
        this.visit(expression);
        // console.log(this.result);
        return this.result as T;
    }

    visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        this.result = arg0.value;
        return arg0;
    }

    visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): TypedExpression<T[TMember]>
    {
        if (arg0.source)
            this.visit(arg0.source);

        let source = this.result;

        this.visit(arg0.member);
        const key = this.result as string | symbol;

        if (source instanceof Injector)
        {
            this.result = source.resolve(key);
            return arg0;
        }
        if (isPromiseLike(source))
        {
            this.result = source.then((result) => { return result[key] });
            return arg0;
        }

        this.result = source && source[key];
        return arg0;
    }
}