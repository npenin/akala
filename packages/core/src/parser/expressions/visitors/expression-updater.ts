import { Expressions, StrictExpressions, StrictTypedExpression, TypedExpression } from "../expression.js";
import { ExpressionVisitor } from "./expression-visitor.js";
import { IVisitable } from "../visitable.js";

export class ExpressionUpdater extends ExpressionVisitor
{
    constructor(private original: Expressions, private newExp: Expressions)
    {
        super();

    }

    private rootCall = true;

    /**
     * Updates an expression.
     * @param {any} expression - The expression to update.
     * @param {any} newValue - The new value for the expression.
     * @returns {any} The updated expression.
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
                return this.visit(expression);
            }
            finally
            {
                this.original.accept = originalAccept;
            }

        }
    }
}
