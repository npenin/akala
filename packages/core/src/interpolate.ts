import { Binding } from './binder'
import { escapeRegExp } from './reflect';

type EvalFunction<T> = (value: any) => T;

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

    public buildObject<T>(obj: T, mustHaveExpression?: boolean, trustedContext?: boolean, allOrNothing?: boolean): EvalFunction<T>
    {
        switch (typeof obj)
        {
            case 'object':
                if (Array.isArray(obj))
                {
                    const fns = obj.map((v => this.buildObject(v, mustHaveExpression, trustedContext, allOrNothing)));
                    return (value) => fns.map(fn => fn(value)) as unknown as T
                }
                else if (obj instanceof Object)
                {
                    const builder: [string, EvalFunction<unknown>][] = Object.entries(obj).map(kvp => [kvp[0], this.buildObject(kvp[1], mustHaveExpression, trustedContext, allOrNothing)]);
                    return (value) => Object.fromEntries(builder.map(kvp => [kvp[0], kvp[1](value)])) as unknown as T;
                }
                return () => obj;
            case 'string':
                return this.build(obj, mustHaveExpression, trustedContext, allOrNothing);
            default:
            case 'function':
                return () => obj;
        }
    }

    public build<T extends string>(text: T, mustHaveExpression?: boolean, trustedContext?: boolean, allOrNothing?: boolean): EvalFunction<T>
    {
        const startSymbolLength = this.startSymbol.length,
            endSymbolLength = this.endSymbol.length;

        if (!text.length || text.indexOf(this.startSymbol) === -1)
        {
            let constantInterp;
            if (!mustHaveExpression)
            {
                return function (target)
                {
                    return text;
                }
            }
            return constantInterp;
        }

        allOrNothing = !!allOrNothing;
        let startIndex,
            endIndex,
            index = 0;
        const expressions = [],
            parseFns: ((target: any) => Binding)[] = [],
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
                let exp = text.substring(startIndex + startSymbolLength, endIndex);
                expressions.push(exp);
                parseFns.push(function (target)
                {
                    return new Binding(exp.trim(), target);
                });
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

        const compute = function (values: Binding[])
        {
            for (let i = 0, ii = expressions.length; i < ii; i++)
            {
                if (allOrNothing && typeof (values[i].getValue()))
                    return;
                concat[expressionPositions[i]] = values[i].getValue();
            }
            if (concat.length === 1)
                return concat[0];
            return concat.join('');
        };

        return function interpolationFn(target)
        {
            const bindings: Binding[] = [];

            for (let i = 0; i < expressions.length; i++)
            {
                bindings[i] = parseFns[i](target);
            }

            return compute(bindings);
        }

    }

}