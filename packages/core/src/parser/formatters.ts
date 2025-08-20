import { EvaluatorAsFunction } from "./evaluator-as-function.js";
import type { Expressions } from "./expressions/index.js";
import type { Formatter, ReversibleFormatter } from "../formatters/common.js";
import { formatters } from "../formatters/index.js";
import { Parser } from "./parser.js";

export type SortDirection = 'asc' | 'desc' | 'none';

/**
 * A formatter that converts any value to a boolean
 * 
 * @example
 * Booleanize.instance.format('truthy value') // returns true
 * Booleanize.instance.format(0) // returns false
 */
export default class Sort<T> implements Formatter<T[]>
{
    public static compare<T>(a: T, b: T): number
    {
        switch (typeof a)
        {
            case "string":
                switch (typeof b)
                {
                    case "string":
                        return a.localeCompare(b);
                    case "number":
                    case "bigint":
                    case "boolean":
                    case "symbol":
                        return a.localeCompare(b.toString());
                    case "object":
                        if (b === null)
                            return 1;
                        break;
                    case "undefined":
                        return 1;
                    case "function":
                        return 0;

                }
                break;
            case "number":

                switch (typeof b)
                {
                    case "string":
                        return -b.localeCompare(a.toString());
                    case "number":
                        return a - b;
                    case "bigint":
                        if (a > b)
                            return 1;
                        if (a < b)
                            return -1;
                        return 0;
                    case "boolean":
                        if (a)
                            return b ? 0 : 1
                        else
                            return b ? -1 : 0;
                    case "symbol":
                        return 0;
                    case "object":
                        if (b === null)
                            return a ? 1 : 0;
                        return 0;
                    case "undefined":
                        return a ? 1 : 0;
                    case "function":
                        return 0;

                }
            case "bigint":
                switch (typeof b)
                {
                    case "string":
                        return a.toString().padStart(b.length, '0').localeCompare(b);
                    case "number":
                    case "bigint":
                        if (a > b)
                            return 1;
                        if (a < b)
                            return -1;
                        return 0;
                    case "boolean":
                        if (a)
                            return b ? 0 : 1
                        else
                            return b ? -1 : 0;
                    case "symbol":
                        return 0;
                    case "undefined":
                        return a ? 1 : 0;
                    case "object":
                        if (b === null)
                            return a ? 1 : 0;
                        return 0;
                    case "function":
                        return 0;
                }
            case "boolean":
                switch (typeof b)
                {
                    case "string":
                        if (a)
                            return 1;
                        else if (b)
                            return -1;
                        return 0;
                    case "number":
                        return Number(a) - b;
                    case "bigint":
                        return Number(BigInt(a) - b);
                    case "undefined":
                    case "boolean":
                    case "object":
                        if (a)
                            return b ? 0 : 1;
                        else if (b)
                            return -1;
                        return 0;
                    case "symbol":
                    case "function":
                        return 0;

                }
            case "symbol":
                switch (typeof b)
                {
                    case "string":
                        return a.toString().localeCompare(b);
                    case "number":
                    case "bigint":
                    case "boolean":
                        return 0;
                    case "symbol":
                        return a.toString().localeCompare(b.toString());
                    case "undefined":
                        return 1;
                    case "object":
                    case "function":
                        return 0;

                }
            case "undefined":

                switch (typeof b)
                {
                    case "string":
                    case "number":
                    case "bigint":
                    case "boolean":
                    case "symbol":
                        return -1;
                    case "undefined":
                        return 0;
                    case "object":
                        if (b === null)
                            return 0;
                        return -1
                    case "function":
                        return -1;
                }
            case "object":
                if (a === null)
                    return -1;
                return 0;
            case "function":
                return 0;

        }
        return 0;
    }
    private readonly sortSettings: { path: (x: T) => unknown, direction: SortDirection }[]

    constructor(sortSettings: { path: Expressions, direction: SortDirection }[])
    {
        const evaluator = new EvaluatorAsFunction();
        this.sortSettings = sortSettings.map(s => ({ path: evaluator.eval(s.path), direction: s.direction }))
    }

    /**
     * Converts any input value to a boolean using double negation
     * @param a - The value to convert to boolean
     * @returns Boolean representation of the input value
     */
    format(a: Array<T> | undefined | null): T[]
    {
        if (a && !Array.isArray(a))
            a = Array.from(a as any);

        return a?.sort((a, b) =>
        {
            return this.sortSettings.reduce((previous, current) =>
            {
                if (previous)
                    return previous;

                switch (current.direction)
                {
                    case "asc":
                        return Sort.compare(current.path(a), current.path(b))
                    case "desc":
                        return Sort.compare(current.path(b), current.path(a))
                    case "none":
                        return 0;
                }
            }, 0)
        })
    }
}

formatters.register('sort', Sort);

export class ParserFormatter implements ReversibleFormatter<Expressions, string>
{
    unformat(value: Expressions): string
    {
        return value.toString();
    }
    format(value: string): Expressions
    {
        return Parser.parameterLess.parse(value);
    }

}

formatters.register('parse', ParserFormatter);

