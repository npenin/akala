import * as akala from '@akala/core';
import { Control } from './controls/controls'
import { Scope } from './scope'
import { service } from './common'

if (MutationObserver && false)
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


    public static build(text: string, mustHaveExpression?: boolean, trustedContext?: boolean, allOrNothing?: boolean): (obj: any) => string
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
export interface templateFunction
{
    (target: any, parent: HTMLElement): ArrayLike<HTMLElement>;
    hotReplace(markup: string): void;
}
var cache = new akala.Injector();
@service('$template', '$interpolate', '$http')
export class Template
{
    constructor(private interpolator: Interpolate, private http: akala.Http) { }

    public enableHotReplacement: boolean;

    public async get(t: string | PromiseLike<string>, registerTemplate: boolean = true): Promise<templateFunction>
    {
        var http = this.http;
        var text = await akala.Promisify(t);

        if (!text)
            return null;

        var template = <templateFunction | PromiseLike<templateFunction>>cache.resolve(text);
        if (template)
            return template;
        else if (/</.test(text))
        {
            template = Template.build(text);
            return template;
        }
        else
        {
            var internalGet = (async function ()
            {
                var response = await http.get(text)
                var data = await response.text();
                template = Template.build(data);
                if (registerTemplate)
                    cache.register(text, template, true);
                if (navigator.serviceWorker)
                {

                    navigator.serviceWorker.addEventListener('message', function (msg)
                    {

                    })
                }
                return template;
            })();

            cache.register(text, internalGet);
            return await internalGet;
        }
    }

    public static buildElements(string): ArrayLike<HTMLElement>
    {
        var root = document.createElement('div');
        root.innerHTML = string;
        return akala.map(root.children, function (el) { return el as HTMLElement });
    }

    public static build(markup: string): templateFunction
    {
        var template = Interpolate.build(markup)
        var f: templateFunction = function (data, parent?: HTMLElement)
        {
            f.hotReplace = function (markup: string)
            {
                template = Interpolate.build(markup);
                var newTemplateInstance = Template.buildElements(template(data));
                if (parent)
                {
                    if (newTemplateInstance.length > templateInstance.length)
                        akala.each(newTemplateInstance, function (inst, i)
                        {
                            if (i < templateInstance.length)
                                parent.replaceChild(inst, templateInstance[i]);
                            else
                                parent.appendChild(inst);
                        })
                    else
                        akala.each(templateInstance, function (inst, i)
                        {
                            if (i < newTemplateInstance.length)
                                parent.replaceChild(newTemplateInstance[i], inst);
                            else
                                parent.removeChild(inst);
                        })
                }
                else
                {
                    confirm('template has changed, please consider reloading to see updated change');
                }
                templateInstance = newTemplateInstance;
                applyTemplate(templateInstance, data, parent) as ArrayLike<HTMLElement>
            }

            var templateInstance = Template.buildElements(template(data));
            if (parent)
            {
                akala.each(templateInstance, function (inst)
                {
                    parent.appendChild(inst);
                })
            }
            return applyTemplate(templateInstance, data, parent) as ArrayLike<HTMLElement>;
        } as any;
        f.hotReplace = function (markup: string)
        {
            template = Interpolate.build(markup);
        }

        return f;
    }
}

export function filter<T extends Element = Element>(items: ArrayLike<T>, filter: string)
{
    return akala.grep(items, function (element)
    {
        return element.matches(filter);
    })
}

export function applyTemplate(items: ArrayLike<HTMLElement>, data, root?: Element)
{
    data.$new = Scope.prototype.$new;
    if (filter(items, '[data-bind]').length == 0)
    {
        akala.each(items, function (el)
        {
            akala.each(el.querySelectorAll('[data-bind]'), function (el: HTMLElement)
            {
                var closest = el.parentElement && el.parentElement.closest('[data-bind]');
                var applyInnerTemplate = !!closest || !root;
                if (!applyInnerTemplate && root)
                    applyInnerTemplate = applyInnerTemplate || root == closest;
                if (applyInnerTemplate)
                {
                    applyTemplate([el], data, el);
                }
            });
        });
        return items;
    }
    else
    {
        var element: Element[] = [];
        var promises: PromiseLike<void>[] = [];
        akala.each(filter(items, '[data-bind]'), function (item)
        {
            var subElem = Control.apply(akala.Parser.evalAsFunction(item.dataset['bind'], true), item, data);
            if (akala.isPromiseLike(subElem))
            {
                promises.push(Promise.resolve(subElem).then(function (subElem)
                {
                    if (Array.isArray(subElem))
                        for (let i = 0; i < subElem.length; i++)
                            element.push(subElem[i]);
                    else
                        element.push(subElem as Element);
                }));
            }
            else
                element.push(subElem as Element);
        });
        if (promises.length)
            return akala.when(promises).then(function ()
            {
                return element;
            });
        return element;
    }
};