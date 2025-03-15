import { BuildWatcherAndSetter } from "../observables/object.js";
import { Expressions, TypedLambdaExpression } from "./expressions/index.js";
import { ExpressionsWithLength } from "./parser.js";

export type ParsedFunction<T> = (context?: unknown) => T;

/**
 * EvaluatorAsFunction class.
 */
export class EvaluatorAsFunction
{
    /**
     * Evaluates a typed lambda expression.
     * @param {TypedLambdaExpression<T>} expression - The expression to evaluate.
     * @returns {T} The evaluated expression.
     */
    public eval<T extends (...args: unknown[]) => unknown>(expression: TypedLambdaExpression<T>): T

    /**
     * Evaluates an expression with length.
     * @param {ExpressionsWithLength} expression - The expression to evaluate.
     * @returns {ParsedFunction<T>} The evaluated expression as a function.
     */
    public eval<T = unknown>(expression: ExpressionsWithLength): ParsedFunction<T>

    /**
     * Evaluates an expression.
     * @param {Expressions | TypedLambdaExpression<(...args: unknown[]) => T>} expression - The expression to evaluate.
     * @returns {ParsedFunction<T> | T} The evaluated expression.
     */
    public eval<T = unknown>(expression: Expressions | TypedLambdaExpression<(...args: unknown[]) => T>): ParsedFunction<T> | T
    {
        const builder = new BuildWatcherAndSetter();
        const result = builder.eval<T>(expression);

        return (context: object) => result.watcher(context, null);

    }

}
