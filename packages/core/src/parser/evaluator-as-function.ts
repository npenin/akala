import { BuildWatcherAndSetter } from "../observables/object.js";
import { Expressions, TypedLambdaExpression } from "./expressions/index.js";
import { ExpressionsWithLength } from "./parser.js";

export type ParsedFunction<T> = (context?: unknown) => T;

export class EvaluatorAsFunction
{
    public eval<T extends (...args: unknown[]) => unknown>(expression: TypedLambdaExpression<T>): T
    public eval<T = unknown>(expression: ExpressionsWithLength): ParsedFunction<T>
    public eval<T = unknown>(expression: Expressions | TypedLambdaExpression<(...args: unknown[]) => T>): ParsedFunction<T> | T
    {
        const builder = new BuildWatcherAndSetter();
        const result = builder.eval<T>(expression);

        return (context: object) => result.watcher(context, null);

    }

}