import { isPromiseLike } from '../promiseHelpers.js';
import { ConstantExpression } from '../parser/expressions/constant-expression.js';
import { ExpressionVisitor } from '../parser/expressions/visitors/expression-visitor.js';
import { StrictExpressions, TypedExpression } from '../parser/expressions/expression.js';
import { MemberExpression } from '../parser/expressions/member-expression.js';
import { ExpressionsWithLength } from '../parser/parser.js';
import { Injector } from './shared.js';

/**
 * Evaluates expressions by resolving dependencies through an injector.
 * This class extends ExpressionVisitor to traverse and resolve expressions recursively.
 */
export class InjectorEvaluator extends ExpressionVisitor
{
    /**
     * Initializes the evaluator with a dependency injector.
     * @param injector - The injector instance used to resolve dependencies during expression evaluation.
     */
    constructor(private injector: Injector)
    {
        super();
    }

    private result: unknown;

    /**
     * Evaluates the provided expression and returns the computed result.
     * @template T - The expected return type of the expression evaluation.
     * @param expression - The expression tree to evaluate.
     * @returns The resolved value after traversing and computing the expression.
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
     * Handles constant expressions by setting the result to their fixed value.
     * @param expression - The constant expression containing the static value.
     * @returns The same constant expression after processing.
     */
    visitConstant(expression: ConstantExpression<unknown>): StrictExpressions
    {
        this.result = expression.value;
        return expression;
    }

    /**
     * Resolves member access expressions (e.g., object.property).
     * Evaluates the source expression and retrieves the member value via dependency injection if applicable.
     * @template T - The type of the source object.
     * @template TMember - The key type of the member being accessed.
     * @param expression - The member expression representing property access.
     * @returns The processed member expression with updated resolution context.
     */
    visitMember<T, TMember extends keyof T>(expression: MemberExpression<T, TMember, T[TMember]>): TypedExpression<T[TMember]>
    {
        if (expression.source)
            this.visit(expression.source);

        let source = this.result;

        this.visit(expression.member);
        const key = this.result as string | symbol;

        if (source instanceof Injector)
        {
            this.result = source.resolve(key);
            return expression;
        }
        if (isPromiseLike(source))
        {
            this.result = source.then((result) => { return result[key] });
            return expression;
        }

        this.result = source && source[key];
        return expression;
    }
}
