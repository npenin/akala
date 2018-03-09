import '@akala/core'
import * as akala from '@akala/core';
import { Control } from './controls/controls'
import { Scope } from './scope'
import { service } from './common'

interface JQueryStatic
{
    tmpl: Function;
    tmplItem: Function;
    template: Function;
}

if (MutationObserver)
{
    var domObserver = new MutationObserver(function (mutations: MutationRecord[])
    {
        mutations.forEach(function (mutation)
        {
            switch (mutation.type)
            {
                case 'characterData':
                    return;
                case 'attributes':

                case 'childList':

            }
        })
    })
}

@service('$interpolate')
export class Interpolate
{
    private static _startSymbol = '{{';
    private static _endSymbol = '}}';

    public get startSymbol() { return Interpolate._startSymbol; };
    public set startSymbol(value: string) { Interpolate._startSymbol = value; };
    public get endSymbol() { return Interpolate._endSymbol; };
    public set endSymbol(value: string) { Interpolate._endSymbol = value; };

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


    public static build(text: string, mustHaveExpression?: boolean, trustedContext?: boolean, allOrNothing?: boolean)
    {
        var startSymbolLength = Interpolate._startSymbol.length,
            endSymbolLength = Interpolate._endSymbol.length;

        if (!text.length || text.indexOf(Interpolate._startSymbol) === -1)
        {
            var constantInterp;
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
        var startIndex,
            endIndex,
            index = 0,
            expressions = [],
            parseFns: ((target: any) => akala.Binding)[] = [],
            textLength = text.length,
            exp,
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
                    return new akala.Binding(exp, target);
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

        var compute = function (values: akala.Binding[])
        {
            for (var i = 0, ii = expressions.length; i < ii; i++)
            {
                if (allOrNothing && typeof (values[i]))
                    return;
                concat[expressionPositions[i]] = values[i].getValue();
            }
            return concat.join('');
        };

        return function interpolationFn(target)
        {
            var bindings: akala.Binding[] = [];

            for (var i = 0; i < expressions.length; i++)
            {
                bindings[i] = parseFns[i](target);
            }

            return compute(bindings);
        }

    }

}
export type templateFunction = (target: any, parent: JQuery) => JQuery;
var cache = new akala.Injector();
@service('$template', '$interpolate', '$http')
export class Template
{
    constructor(private interpolator: Interpolate, private http: akala.Http) { }

    public get(t: string | PromiseLike<string>, registerTemplate: boolean = true): PromiseLike<templateFunction>
    {
        var http = this.http;
        var self = this;
        return akala.Promisify(t).then<templateFunction>(function (t: string)
        {
            var p = new Promise<templateFunction>((resolve, reject) =>
            {
                if (!t)
                    resolve(null);
                else
                {
                    var template = <templateFunction | PromiseLike<templateFunction>>cache.resolve(t);
                    if (template)
                        resolve(template);
                    else if (/</.test(t))
                    {
                        template = Template.build(t);
                        resolve(template);
                    }
                    else
                    {
                        cache.register(t, p);
                        http.get(t).then(function (data)
                        {
                            var template = Template.build(data);
                            if (registerTemplate)
                                cache.register(t, template, true);
                            resolve(template);
                        },
                            reject
                        );
                    }
                }
            });
            return p;
        });
    }

    public static build(markup: string): templateFunction
    {
        var template = Interpolate.build(markup)
        return function (data, parent?)
        {
            var templateInstance = $(template(data));
            if (parent)
                templateInstance.appendTo(parent);
            return templateInstance.applyTemplate(data, parent);
        }
    }
}


var databindRegex = /(\w+):([^;]+);?/g;

akala.extend($.fn, {
    applyTemplate: function applyTemplate(data, root?: JQuery)
    {
        data.$new = Scope.prototype.$new;
        if (this.filter('[data-bind]').length == 0)
        {
            this.find('[data-bind]').each(function (this: HTMLElement)
            {
                var closest = $(this).parent().closest('[data-bind]');
                var applyInnerTemplate = closest.length == 0;
                if (!applyInnerTemplate && root)
                    root.each(function (i, it) { applyInnerTemplate = applyInnerTemplate || it == closest[0]; });
                if (applyInnerTemplate)
                {
                    $(this).applyTemplate(data, this);
                }
            });
            return this;
        }
        else
        {
            var element = $();
            var promises: PromiseLike<void>[] = [];
            this.filter('[data-bind]').each(function (index, item)
            {
                var $item = $(item);
                var subElem = Control.apply(akala.Parser.evalAsFunction($item.attr("data-bind"), true), $item, data);
                if (akala.isPromiseLike(subElem))
                {
                    promises.push(subElem.then(function (subElem)
                    {
                        element = element.add(subElem);
                    }));
                }
                else
                    element = element.add(subElem);
            });
            if (promises.length)
                return akala.when(promises).then(function ()
                {
                    return element;
                });
            return element;
        }
    },
    tmpl: function (data, options)
    {
        if (this.length > 1)
            throw 'A template can only be a single item';
        if (this.length == 0)
            return null;
        return Template.build(this[0]);
    }
});