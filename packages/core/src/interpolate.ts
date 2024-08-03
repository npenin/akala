import { EvaluatorAsFunction } from './parser/evaluator-as-function.js';
import { Parser } from './parser/parser.js';
import { escapeRegExp } from './reflect.js';

// type EvalFunction<T> = (value: unknown) => T;
type InterpolateFn<T> = ((value: unknown) => T) & { expressions: string[] };

export class Interpolate
{
    constructor(public readonly startSymbol = '{{', public readonly endSymbol = '}}')
    {
        this.escapedStartRegexp = new RegExp(escapeRegExp(this.startSymbol), 'g');
        this.escapedEndRegexp = new RegExp(escapeRegExp(this.endSymbol), 'g');
    }

    private unescapeText(text)
    {
        return text.replace(this.escapedStartRegexp, this.startSymbol).
            replace(this.escapedEndRegexp, this.endSymbol);
    }

    private escapedStartRegexp: RegExp;
    private escapedEndRegexp: RegExp;

    public buildObject<T>(obj: T, mustHaveExpression?: boolean, evaluator?: (expression: string) => ((target: unknown) => any), allOrNothing?: boolean): InterpolateFn<T>
    {
        switch (typeof obj)
        {
            case 'object':
                if (Array.isArray(obj))
                {
                    const fns = obj.map((v => this.buildObject(v, mustHaveExpression, evaluator, allOrNothing)));
                    return Object.assign((value) => fns.map(fn => fn(value)) as unknown as T, { expressions: fns.flatMap(fn => fn.expressions) })
                }
                else if (obj instanceof Object)
                {
                    const builder = Object.entries(obj).map(kvp => [kvp[0], this.buildObject(kvp[1], mustHaveExpression, evaluator, allOrNothing)] as const);
                    return Object.assign((value) => Object.fromEntries(builder.map(kvp => [kvp[0], kvp[1](value)])) as unknown as T, { expressions: builder.flatMap(e => e[1].expressions) });
                }
                return Object.assign(() => obj, { expressions: [] });
            case 'string':
                return this.build(obj, mustHaveExpression, evaluator, allOrNothing);
            default:
            case 'function':
                return Object.assign(() => obj, { expressions: [] });
        }
    }

    public static Evaluator = (exp: string) => new EvaluatorAsFunction().eval(new Parser().parse(exp));

    public build<T extends string>(text: T, mustHaveExpression?: boolean, evaluator?: (expression: string) => ((target: unknown) => any), allOrNothing?: boolean): InterpolateFn<T>
    {
        const startSymbolLength = this.startSymbol.length,
            endSymbolLength = this.endSymbol.length;

        if (!evaluator)
            evaluator = Interpolate.Evaluator

        if (!text.length || text.indexOf(this.startSymbol) === -1)
        {
            let constantInterp;
            if (!mustHaveExpression)
            {
                return Object.assign(function ()
                {
                    return text;
                }, { expressions: [] });
            }
            return constantInterp;
        }

        allOrNothing = !!allOrNothing;
        let startIndex: number,
            endIndex: number,
            index = 0;
        const expressions = [],
            parseFns: ((target: unknown) => string)[] = [],
            textLength = text.length,
            concat = [],
            expressionPositions = [];

        while (index < textLength)
        {
            if (((startIndex = text.indexOf(this.startSymbol, index)) !== -1) &&
                ((endIndex = text.indexOf(this.endSymbol, startIndex + startSymbolLength)) !== -1))
            {
                if (index !== startIndex)
                {
                    concat.push(this.unescapeText(text.substring(index, startIndex)));
                }
                const exp = text.substring(startIndex + startSymbolLength, endIndex);
                expressions.push(exp);
                parseFns.push(evaluator(exp));
                index = endIndex + endSymbolLength;
                expressionPositions.push(concat.length);
                concat.push('');
            } else
            {
                // we did not find an interpolation, so we have to add the remainder to the separators array
                if (index !== textLength)
                {
                    concat.push(this.unescapeText(text.substring(index)));
                }
                break;
            }
        }

        function interpolationFn(target)
        {
            for (let i = 0, ii = expressions.length; i < ii; i++)
            {
                const result = parseFns[i](target);
                if (allOrNothing && typeof (result) == 'undefined')
                    return;
                concat[expressionPositions[i]] = result;
            }
            if (concat.length === 1)
                return concat[0];
            return concat.join('');
        }

        interpolationFn.expressions = expressions;
        return interpolationFn;
    }

}