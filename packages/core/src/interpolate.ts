import { Binding } from './binder'

export class Interpolate
{
    private static _startSymbol = '{{';
    private static _endSymbol = '}}';

    public get startSymbol() { return Interpolate._startSymbol; }
    public set startSymbol(value: string) { Interpolate._startSymbol = value; }
    public get endSymbol() { return Interpolate._endSymbol; }
    public set endSymbol(value: string) { Interpolate._endSymbol = value; }

    private static unescapeText(text)
    {
        return text.replace(this.escapedStartRegexp, Interpolate._startSymbol).
            replace(this.escapedEndRegexp, Interpolate._endSymbol);
    }

    private static escape(ch)
    {
        return '\\\\\\' + ch;
    }

    private static escapedStartRegexp = new RegExp(Interpolate._startSymbol.replace(/./g, Interpolate.escape), 'g');
    private static escapedEndRegexp = new RegExp(Interpolate._endSymbol.replace(/./g, Interpolate.escape), 'g');


    public static build(text: string, mustHaveExpression?: boolean, trustedContext?: boolean, allOrNothing?: boolean): (value: any) => string
    {
        const startSymbolLength = Interpolate._startSymbol.length,
            endSymbolLength = Interpolate._endSymbol.length;

        if (!text.length || text.indexOf(Interpolate._startSymbol) === -1)
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
            exp: string,
            index = 0;
        const expressions = [],
            parseFns: ((target: any) => Binding)[] = [],
            textLength = text.length,
            concat = [],
            expressionPositions = [];

        while (index < textLength)
        {
            if (((startIndex = text.indexOf(Interpolate._startSymbol, index)) !== -1) &&
                ((endIndex = text.indexOf(Interpolate._endSymbol, startIndex + startSymbolLength)) !== -1))
            {
                if (index !== startIndex)
                {
                    concat.push(this.unescapeText(text.substring(index, startIndex)));
                }
                exp = text.substring(startIndex + startSymbolLength, endIndex);
                expressions.push(exp);
                parseFns.push(function (target)
                {
                    return new Binding(exp, target);
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