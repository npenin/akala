import { ExpressionType } from "../expression-type.js";
import type { Expressions, StrictExpressions, TypedExpression } from "../expression.js";
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

    public visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): StrictExpressions
    {
        if (arg0.source == undefined)
        {
            if (this.contexttualSource.type == ExpressionType.MemberExpression)
                return new MemberExpression(this.contexttualSource as TypedExpression<any>, arg0.member, arg0.optional);

            if (this.contexttualSource.type == ExpressionType.NewExpression)
            {
                const sub = this.contexttualSource.init.find(e => ExpressionComparer.equals(e.member, arg0.member));
                if (sub)
                    return sub.source;
            }

            return new MemberExpression(this.contexttualSource as TypedExpression<any>, arg0.member, arg0.optional);
        }
        return super.visitMember(arg0);
    }

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

