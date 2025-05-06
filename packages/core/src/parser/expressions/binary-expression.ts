import { BinaryOperator } from './binary-operator.js';
import { Expression, Expressions, StrictExpressions, TypedExpression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';
import { MemberExpression } from './member-expression.js';
import { TernaryExpression } from './ternary-expression.js';

/**
 * Represents a binary expression.
 * @template T - The type of the expressions.
 */
export class BinaryExpression<T extends Expressions = StrictExpressions> extends Expression
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.BinaryExpression} The type of the expression.
     */
    public get type(): ExpressionType.BinaryExpression { return ExpressionType.BinaryExpression; }

    /**
     * Initializes a new instance of the BinaryExpression class.
     * @param {T} left - The left expression.
     * @param {BinaryOperator} operator - The binary operator.
     * @param {T} right - The right expression.
     */
    constructor(public readonly left: T, public readonly operator: BinaryOperator, public readonly right: T)
    {
        super();
    }

    /**
     * Accepts a visitor.
     * @param {ExpressionVisitor} visitor - The visitor.
     * @returns {any} The result of the visit.
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitBinary(this);
    }


    /**
     * Applies precedence to a parsed binary expression.
     * @param {ParsedBinary} operation - The parsed binary expression.
     * @returns {ParsedBinary} The parsed binary expression with applied precedence.
     */
    public static applyPrecedence<T extends Expressions = StrictExpressions>(operation: BinaryExpression<T>)
    {
        if (operation.operator != BinaryOperator.Plus && operation.operator != BinaryOperator.Minus)
        {
            if (operation.right instanceof BinaryExpression)
            {
                const right = BinaryExpression.applyPrecedence(operation.right);
                switch (operation.operator)
                {
                    case BinaryOperator.Times: // b*c+d ==> (b*c)+d
                    case BinaryOperator.Div:
                    case BinaryOperator.And:
                        return new BinaryExpression(new BinaryExpression(operation.left, operation.operator, right.left), right.operator, right.right);
                    case BinaryOperator.QuestionDot:
                    case BinaryOperator.Dot:
                        return new MemberExpression(new MemberExpression(operation.left as TypedExpression<unknown>, right.left, operation.operator == BinaryOperator.QuestionDot), right.right, right.operator == BinaryOperator.QuestionDot);
                }
            }
            if (operation.right instanceof TernaryExpression)
            {
                return new TernaryExpression(new BinaryExpression(operation.left, operation.operator, operation.right.first), operation.right.operator, operation.right.second, operation.right.third)
            }
        }
        return operation;
    }

    public toString()
    {
        return `( ${this.left} ${this.operator} ${this.right} )`
    }
}
