import { isPromiseLike } from '../promiseHelpers.js';
import { ConstantExpression } from '../parser/expressions/constant-expression.js';
import { ExpressionVisitor } from '../parser/expressions/visitors/expression-visitor.js';
import { StrictExpressions, TypedExpression } from '../parser/expressions/expression.js';
import { MemberExpression } from '../parser/expressions/member-expression.js';
import { ExpressionsWithLength } from '../parser/parser.js';
import { Injector } from './shared.js';

/**
 * Evaluates expressions using an injector.
 */
export class InjectorEvaluator extends ExpressionVisitor
{
    /**
     * Creates an instance of InjectorEvaluator.
     * @param {Injector} injector - The injector to use for evaluation.
     */
    constructor(private injector: Injector)
    {
        super();
    }

    private result: unknown;

    /**
     * Evaluates an expression.
     * @param {ExpressionsWithLength} expression - The expression to evaluate.
     * @returns {T} The result of the evaluation.
     */
    public eval<T>(expression: ExpressionsWithLength): T
    {
        // console.log(expression);
        this.result = this.injector;
        this.visit(expression);
        // console.log(this.result);
        return this.result as T;
    }

    /**
     * Visits a constant expression.
     * @param {ConstantExpression<unknown>} arg0 - The constant expression to visit.
     * @returns {StrictExpressions} The visited expression.
     */
    visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        this.result = arg0.value;
        return arg0;
    }

    /**
     * Visits a member expression.
     * @param {MemberExpression<T, TMember, T[TMember]>} arg0 - The member expression to visit.
     * @returns {TypedExpression<T[TMember]>} The visited expression.
     */
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
