import { ExpressionType } from "../expression-type.js";
import { Expressions, StrictExpressions, TypedExpression } from "../expression.js";
import { MemberExpression } from "../member-expression.js";
import { NewExpression } from "../new-expression.js";
import { ExpressionVisitor } from "./expression-visitor.js";
import { ExpressionComparer } from "./expression-comparer.js";

/**
 * Simplifies an expression.
 * @param {any} expression - The expression to simplify.
 * @returns {any} The simplified expression.
 */
export class ExpressionSimplifyer extends ExpressionVisitor
{
    /**
     * Creates a new instance with the provided source expression.
     * @param source - The original expression to simplify
     */
    constructor(private source: Expressions)
    {
        super();
        // const identifier = new OriginIdentifier();
        // identifier.visit(source);
        // identifier.origins;
        this.contexttualSource = source;
    }

    private contexttualSource: Expressions;

    /**
     * Processes a member expression during simplification.
     * @template T - The source type
     * @template TMember - The member key type
     * @param arg0 - The member expression to simplify
     * @returns - The simplified member expression
     */
    public visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): StrictExpressions
    {
        if (arg0.source == undefined)
        {
            if (this.contexttualSource.type == ExpressionType.MemberExpression)
                return new MemberExpression(this.contexttualSource as TypedExpression<any>, arg0.member, arg0.optional);

            if (this.contexttualSource.type == ExpressionType.NewExpression)
            {
                const sub = this.contexttualSource.init.find(e => ExpressionComparer.equals(e.member, arg0.member));
                return sub.source;
            }

            return new MemberExpression(this.contexttualSource as TypedExpression<any>, arg0.member, arg0.optional);
        }
        return super.visitMember(arg0);
    }

    /**
     * Simplifies a new expression by processing its initialization members.
     * @template T - The new expression's value type
     * @param expression - The new expression to simplify
     * @returns - The simplified new expression
     */
    visitNew<T>(expression: NewExpression<T>): StrictExpressions
    {
        // var members: MemberExpression<any, any, any>[] = null;
        const members = this.visitArray(expression.init as Expressions[], (exp, i) => { this.contexttualSource = this.source; }) as unknown as MemberExpression<any, any, any>[];
        if (members !== expression.init)
        {
            return new NewExpression<T>(...members);
        }
        return expression;
    }
}

