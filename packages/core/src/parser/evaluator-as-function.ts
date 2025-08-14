import { BuildWatcherAndSetter } from "../observables/object.js";
import type { Expressions, TypedLambdaExpression } from "./expressions/index.js";

export type ParsedFunction<T> = (context?: unknown) => T;

/**
 * A class for converting expressions into executable functions.
 */
export class EvaluatorAsFunction
{
    /**
     * Creates an instance of EvaluatorAsFunction.
     */
    constructor() { }

    /**
     * Evaluates an expression into a function or value.
     * @template T - The return type of the evaluated expression.
     * @param {TypedLambdaExpression<T>} expression - The typed lambda expression to evaluate.
     * @returns {T} The evaluated value or function.
     */
    public eval<T extends (...args: unknown[]) => unknown>(expression: TypedLambdaExpression<T>): T

    /**
     * Evaluates an expression with length into a function.
     * @template T - The return type of the evaluated function.
     * @param {ExpressionsWithLength} expression - The expression with length to evaluate.
     * @returns {ParsedFunction<T>} The evaluated function.
     */
    public eval<T = unknown>(expression: Expressions): ParsedFunction<T>
    public eval<T = unknown>(
        expression: Expressions | TypedLambdaExpression<(...args: unknown[]) => T>
    ): ParsedFunction<T> | T
    {
        const builder = new BuildWatcherAndSetter();
        const result = builder.eval<T>(expression);

        return (context: object) => result.watcher(context, null);
    }
}
