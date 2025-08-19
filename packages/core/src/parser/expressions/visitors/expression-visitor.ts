import type
{
    Expressions,
    TypedExpression,
    IEnumerable,
    StrictExpressions,
    StrictTypedExpression,
    UnknownExpression
} from '../expression.js';
import { ExpressionType } from '../expression-type.js';
import { BinaryExpression } from '../binary-expression.js';
import { UnaryExpression } from '../unary-expression.js';
import { ParameterExpression } from '../parameter-expression.js';
import { ConstantExpression } from '../constant-expression.js';
import { TypedLambdaExpression, type Parameters } from '../lambda-expression.js';
import { MemberExpression } from '../member-expression.js';
import { CallExpression } from '../call-expression.js';
import { ApplySymbolExpression } from '../apply-symbol-expression.js';
import { NewExpression } from '../new-expression.js';
import type { IVisitable } from '../visitable.js';
import { FormatExpression } from '../../parser.js';
import { TernaryExpression } from '../ternary-expression.js';
import { AssignmentExpression } from '../assignment-expression.js';

/** 
 * Defines a comparison function between two values of type T.
 * @template T - The type of values being compared
 */
export type EqualityComparer<T> = (a: T, b: T) => boolean;

/** 
 * Base class for implementing the Visitor pattern for expression tree processing.
 */
export class ExpressionVisitor
{
    /**
     * Processes an assignment expression by visiting its left and right operands.
     * @template T - The expression's value type
     * @param {AssignmentExpression<T>} expression - The assignment expression to process.
     * @returns {AssignmentExpression<Expressions>} The processed assignment expression.
     */
    visitAssign<T extends Expressions = StrictExpressions>(
        expression: AssignmentExpression<T>
    ): AssignmentExpression<Expressions>
    {
        const left = this.visit(expression.left);
        const right = this.visit(expression.right);
        return left !== expression.left || right !== expression.right
            ? new AssignmentExpression<Expressions>(left, expression.operator, right)
            : expression;
    }

    /**
     * Visits an expression and returns the processed result.
     * @template T - The type of the expression's output value
     * @param {StrictTypedExpression<T>} expression - A strongly-typed expression
     * @returns {StrictTypedExpression<T>} The processed expression
     */
    public visit<T>(expression: StrictTypedExpression<T>): StrictTypedExpression<T>;

    /**
     * Visits a typed expression and returns the processed result.
     * @template T - The type of the expression's output
     * @param {TypedExpression<T>} expression - A typed expression
     * @returns {TypedExpression<T>} The processed expression
     */
    public visit<T>(expression: TypedExpression<T>): TypedExpression<T>;

    /**
     * Visits a strict expression and returns the processed result.
     * @param {StrictExpressions} expression - A strict expression node
     * @returns {StrictExpressions} The processed expression
     */
    public visit(expression: StrictExpressions): StrictExpressions;

    /**
     * Visits an expression implementing the IVisitable interface.
     * @template T - The visitor type
     * @template U - The return type
     * @param {IVisitable<ExpressionVisitor, U>} expression - A visitable expression
     * @returns {Expressions} The processed expression result
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public visit(expression: IVisitable<ExpressionVisitor, any>): Expressions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public visit(expression: IVisitable<ExpressionVisitor, any>): Expressions
    {
        return expression.accept(this);
    }

    /**
     * Handles unknown expression types by attempting to visit them.
     * @param {UnknownExpression} expression - An unknown expression type
     * @returns {Expressions} The processed expression or throws an error
     */
    visitUnknown(expression: UnknownExpression)
    {
        if (expression.accept)
            return expression.accept(this);
        throw new Error("unsupported type");
    }

    /**
     * Processes a format expression by visiting its components.
     * @template TOutput - The formatted output type
     * @param {FormatExpression<TOutput>} expression - The format expression to process
     * @returns {FormatExpression<TOutput>} The processed format expression
     */
    visitFormat<TOutput>(expression: FormatExpression<TOutput>)
    {
        const source = this.visit(expression.lhs);
        if (expression.settings)
        {
            const settings = this.visit(expression.settings);
            if (source !== expression.lhs || settings !== expression.settings)
            {
                return new FormatExpression<TOutput>(source, expression.formatter, settings);
            }
        }
        if (source !== expression.lhs)
            return new FormatExpression<TOutput>(source, expression.formatter, null);
        return expression;
    }

    /**
     * Processes a new expression by visiting its initialization members.
     * @template T - The expression's value type
     * @param {NewExpression<T>} expression - The new expression to process
     * @returns {StrictExpressions} The processed new expression
     */
    visitNew<T>(expression: NewExpression<T>): StrictExpressions
    {
        const members = this.visitArray(expression.init as any) as MemberExpression<T, keyof T, T[keyof T]>[];
        if (members !== expression.init)
            return new NewExpression<T>(...members);
        return expression;
    }

    /**
     * Processes an apply symbol expression by visiting its components.
     * @template T - The source expression type
     * @template U - The result type after applying the symbol
     * @param {ApplySymbolExpression<T, U>} expression - The apply symbol expression to process
     * @returns {StrictExpressions} The processed expression
     */
    visitApplySymbol<T, U>(expression: ApplySymbolExpression<T, U>): StrictExpressions
    {
        const source = this.visit(expression.source);
        const arg = this.visit(expression.argument);
        if (source !== expression.source || arg !== expression.argument)
        {
            if (!this.isTypedExpression(source))
                throw new Error(`Source expression of type ${source?.['type']} cannot be treated as typed`);
            return new ApplySymbolExpression<T, U>(source, expression.symbol, arg);
        }
        return expression;
    }

    /**
     * Processes a call expression by visiting its components.
     * @template T - The source expression type
     * @template TMethod - The method key type
     * @param {CallExpression<T, TMethod>} expression - The call expression to process
     * @returns {StrictExpressions} The processed expression
     */
    visitCall<T, TMethod extends keyof T>(expression: CallExpression<T, TMethod>): StrictExpressions
    {
        const source = this.visit(expression.source);
        const args = this.visitArray(expression.arguments as StrictExpressions[]) as StrictExpressions[];
        if (source !== expression.source || args !== expression.arguments)
        {
            if (!this.isTypedExpression(source))
                throw new Error(`Source expression of type ${source?.['type']} cannot be treated as typed`);
            return new CallExpression<T, TMethod>(source, expression.method, args, expression.optional);
        }
        return expression;
    }

    /**
     * Processes a member expression by visiting its components.
     * @template T - The source expression type
     * @template TMember - The member key type
     * @param {MemberExpression<T, TMember, T[TMember]>} expression - The member expression to process
     * @returns {StrictExpressions} The processed expression
     */
    visitMember<T, TMember extends keyof T>(
        expression: MemberExpression<T, TMember, T[TMember]>
    ): StrictExpressions
    {
        const source = expression.source ? this.visit(expression.source) : expression.source;
        const member = this.visit(expression.member);
        if (source !== expression.source || member !== expression.member)
        {
            if (!this.isTypedExpression(source))
                throw new Error(`Source expression of type ${source?.['type']} cannot be treated as typed`);
            return new MemberExpression<T, TMember, T[TMember]>(
                source as TypedExpression<T>,
                member,
                expression.optional
            );
        }
        return expression;
    }

    /**
     * Checks if an expression is a typed expression.
     * @param {Expressions} expression - The expression to check
     * @returns {expression is TypedExpression<T>} Type predicate indicating if the expression is typed
     */
    isTypedExpression<T>(expression: Expressions): expression is TypedExpression<T>
    {
        return expression != null && (
            expression.type === ExpressionType.ConstantExpression ||
            expression.type === ExpressionType.ParameterExpression ||
            expression.type === ExpressionType.MemberExpression ||
            expression.type === ExpressionType.ApplySymbolExpression ||
            expression.type === ExpressionType.NewExpression ||
            expression.type === ExpressionType.Format ||
            expression.type === ExpressionType.UnaryExpression ||
            (expression.type === ExpressionType.TernaryExpression &&
                this.isTypedExpression(expression.second) &&
                this.isTypedExpression(expression.third))
        );
    }

    /**
     * Processes a lambda expression by visiting its body and parameters.
     * @template T - The lambda's function type
     * @param {TypedLambdaExpression<T>} expression - The lambda expression to process
     * @returns {StrictExpressions} The processed expression
     */
    visitLambda<T extends (...args: unknown[]) => unknown>(
        expression: TypedLambdaExpression<T>
    ): StrictExpressions
    {
        const parameters = this.visitArray(expression.parameters as Expressions[]) as unknown as Parameters<T>;
        const body = this.visit(expression.body);
        if (body !== expression.body || parameters !== expression.parameters)
            return new TypedLambdaExpression<T>(body, ...parameters);
        return expression;
    }

    /**
     * Default equality comparer for items.
     * @template T - The item type
     * @param {T} a - First item
     * @param {T} b - Second item
     * @returns {boolean} True if items are strictly equal
     */
    private static defaultComparer<T>(a: T, b: T): boolean
    {
        return a === b;
    }

    /**
     * Visits items in an enumerable collection and applies transformation logic.
     * @template T - The item type
     * @template U - The transformed item type
     * @param {IEnumerable<T>} source - Source collection
     * @param {addToNew} addToNew - Callback to add transformed items
     * @param {visitSingle} visitSingle - Transformation function per item
     * @param {EqualityComparer<T>} compare - Optional comparison function
     */
    visitEnumerable<T, U extends T>(
        source: IEnumerable<T>,
        addToNew: (item: U, index: number) => void,
        visitSingle: (item: T, index: number) => U,
        compare?: EqualityComparer<T>
    ): void
    {
        const comparator = compare ?? ExpressionVisitor.defaultComparer;
        let temp: T[] = [];
        let index = 0;
        for (const item of source)
        {
            const transformed = visitSingle.call(this, item, index);
            if (!comparator(transformed, item))
            {
                if (temp)
                {
                    temp.forEach(addToNew);
                    temp = null;
                }
            }
            if (temp)
                temp.push(item);
            else
                addToNew(transformed, index);

            index++;
        }
    }

    /**
     * Visits an array of expressions and applies transformation logic.
     * @template T - The input expression type
     * @template U - The output expression type
     * @param {T[]} expressions - Array of expressions to visit
     * @param {preVisit} preVisit - Optional callback before visiting
     * @returns {U[]} The transformed array of expressions
     */
    visitArray<T extends IVisitable<ExpressionVisitor, U>, U extends T>(
        expressions: T[],
        preVisit?: (expression: T, index: number) => void
    ): U[]
    {
        let result: U[] | null = null;
        this.visitEnumerable<T, U>(
            expressions,
            (item, i) =>
            {
                if (!result)
                {
                    result = new Array<U>(expressions.length);
                }
                result[i] = item;
            },
            (e, i) =>
            {
                preVisit?.(e, i);
                return this.visit(e) as unknown as U;
            }
        );
        return result || (expressions as U[]);
    }

    /**
     * Processes a constant expression (no changes required).
     * @param {ConstantExpression<unknown>} expression - The constant expression
     * @returns {StrictExpressions} The same expression
     */
    visitConstant(expression: ConstantExpression<unknown>): StrictExpressions
    {
        return expression;
    }

    /**
     * Processes a parameter expression (no changes required).
     * @param {ParameterExpression<unknown>} expression - The parameter expression
     * @returns {StrictExpressions} The same expression
     */
    visitParameter(expression: ParameterExpression<unknown>): StrictExpressions
    {
        return expression;
    }

    /**
     * Processes a unary expression by visiting its operand.
     * @param {UnaryExpression} expression - The unary expression to process
     * @returns {Expressions} The processed unary expression
     */
    visitUnary(expression: UnaryExpression): Expressions
    {
        const operand = this.visit(expression.operand);
        return operand !== expression.operand
            ? new UnaryExpression(operand, expression.operator)
            : expression;
    }

    /**
     * Processes a binary expression by visiting its left/right operands.
     * @template T - The expression's value type
     * @param {BinaryExpression<T>} expression - The binary expression to process
     * @returns {BinaryExpression<Expressions>} The processed binary expression
     */
    visitBinary<T extends Expressions = StrictExpressions>(
        expression: BinaryExpression<T>
    ): BinaryExpression<Expressions>
    {
        const left = this.visit(expression.left);
        const right = this.visit(expression.right);
        return left !== expression.left || right !== expression.right
            ? new BinaryExpression<Expressions>(left, expression.operator, right)
            : expression;
    }

    /**
     * Processes a ternary expression by visiting its branches.
     * @template T - The expression's value type
     * @param {TernaryExpression<T>} expression - The ternary expression to process
     * @returns {TernaryExpression<Expressions>} The processed ternary expression
     */
    visitTernary<T extends Expressions = StrictExpressions>(
        expression: TernaryExpression<T>
    ): TernaryExpression<Expressions>
    {
        const first = this.visit(expression.first);
        const second = this.visit(expression.second);
        const third = this.visit(expression.third);
        return (
            first !== expression.first ||
            second !== expression.second ||
            third !== expression.third
        )
            ? new TernaryExpression<Expressions>(first, expression.operator, second, third)
            : expression;
    }
}
