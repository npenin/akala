import type { Expressions, StrictExpressions, StrictTypedExpression, TypedExpression } from "../expression.js";
import { ExpressionVisitor } from "./expression-visitor.js";
import type { IVisitable } from "../visitable.js";

/** 
 * Replaces occurrences of a specific expression with another during traversal.
 * This visitor updates an expression tree by substituting the original expression with the new one.
 */
export class ExpressionUpdater extends ExpressionVisitor
{
    /**
     * Creates an instance of ExpressionUpdater.
     * @param original - The expression to be replaced in the tree.
     * @param newExp - The new expression that replaces the original.
     */
    constructor(private original: Expressions, private newExp: Expressions)
    {
        super();

    }

    private rootCall = true;

    /**
     * Performs the expression replacement during traversal.
     * @param expression - The current expression being visited.
     * @returns The updated expression after potential substitution.
     */
    public visit<T>(expression: StrictTypedExpression<T>): StrictTypedExpression<T>;
    public visit<T>(expression: TypedExpression<T>): TypedExpression<T>;
    public visit(expression: StrictExpressions): StrictExpressions;
    public visit(expression: IVisitable<ExpressionVisitor, any>): Expressions;
    public visit(expression: IVisitable<ExpressionVisitor, any>): Expressions
    {
        if (this.rootCall)
        {
            const originalAccept = this.original.accept;
            this.original.accept = () =>
            {
                return this.newExp;
            }
            try
            {
                this.rootCall = false;
                return super.visit(expression);
            }
            finally
            {
                this.original.accept = originalAccept;
            }
        }
        return super.visit(expression);
    }
}
