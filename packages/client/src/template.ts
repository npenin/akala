import * as akala from '@akala/core';
import { Control, IControlInstance } from './controls/controls.js'
import { Scope } from './scope.js'
import { service } from './common.js'

// eslint-disable-next-line no-constant-condition
if (MutationObserver && false)
{
    const domObserver = new MutationObserver(function (mutations: MutationRecord[])
    {
        mutations.forEach(function (mutation)
        {
            switch (mutation.type)
            {
                case 'characterData':
                    return;
                case 'attributes':
                    break;
                case 'childList':
                    break;
            }
        })
    })
}

@service('$interpolate')
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


    public static build(text: string, mustHaveExpression?: boolean, trustedContext?: boolean, allOrNothing?: boolean): (obj: any) => string
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
            index = 0,
            exp;
        const expressions = [],
            parseFns: ((target: any) => akala.Binding)[] = [],
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

        const compute = function (values: akala.Binding[])
        {
            for (let i = 0, ii = expressions.length; i < ii; i++)
            {
                if (allOrNothing && typeof (values[i]))
                    return;
                concat[expressionPositions[i]] = values[i].getValue();
            }
            return concat.join('');
        };

        return function interpolationFn(target)
        {
            const bindings: akala.Binding[] = [];

            for (let i = 0; i < expressions.length; i++)
            {
                bindings[i] = parseFns[i](target);
            }

            return compute(bindings);
        }

    }

}
export interface templateFunction
{
    (target: any, parent: HTMLElement): Promise<IControlInstance<any>[]>;
    hotReplace(markup: string): void;
}

interface Composer<TOptions = any>
{
    selector: string;
    optionName: string;
    apply(items: HTMLElement, data, options?: TOptions): Promise<IControlInstance<any>[]>;
}

class DataBindComposer implements Composer<Control<any>[]>
{
    selector = '[data-bind]';
    optionName = 'databind';
    async apply(item: HTMLElement, data: any, options?: Control<any>[])
    {
        const instances = await Control.apply(options || akala.Parser.evalAsFunction(item.dataset['bind'], true), item, data);

        await akala.eachAsync(item.querySelectorAll(this.selector), async (el: HTMLElement) =>
        {
            if (el.parentElement.closest(this.selector) == item)
                instances.push(...await Template.compose(this, [el], data, item));
        });
        return instances;
    }
}

export function composer(selector: string, optionName: string): ClassDecorator
export function composer(selector: (new () => Composer))
export function composer(selector: Composer)
export function composer(selector: string | Composer | (new () => Composer), optionName?: string)
{
    switch (typeof selector)
    {
        case 'string':
            return function (composingFunction: (items: HTMLElement, data) => Promise<IControlInstance<any>[]>)
            {
                Template.composers.push({ selector: selector, optionName: optionName, apply: composingFunction });
            }
        case 'function':
            Template.composers.push(new selector());
            break;
        case 'object':
            Template.composers.push(selector);
            break;
    }
}

const cache = new akala.Injector();
@service('$template', '$interpolate', '$http')
export class Template
{
    public static composers: Composer[] = [new DataBindComposer()];
    constructor(private interpolator: Interpolate, private http: akala.Http) { }

    public enableHotReplacement: boolean;

    public async get(t: string | PromiseLike<string>, registerTemplate = true): Promise<templateFunction>
    {
        const http = this.http;
        const text = await akala.Promisify(t);

        if (!text)
            return null;

        let template = <templateFunction | PromiseLike<templateFunction>>cache.resolve(text);
        if (template)
            return template;
        else if (/</.test(text))
        {
            template = Template.build(text);
            return template;
        }
        else
        {
            const internalGet = (async function ()
            {
                const response = await http.get(text)
                const data = await response.text();
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
        const root = document.createElement('div');
        root.innerHTML = string;
        return akala.map(root.children, function (el) { return el as HTMLElement });
    }

    public static build(markup: string): templateFunction
    {
        let template = Interpolate.build(markup)
        var f: templateFunction = ((data, parent?: HTMLElement) =>
        {
            f.hotReplace = (markup: string) =>
            {
                template = Interpolate.build(markup);
                const newTemplateInstance = Template.buildElements(template(data));
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
                this.composeAll(templateInstance, data, parent);
            }

            var templateInstance = Template.buildElements(template(data));
            if (parent)
            {
                akala.each(templateInstance, function (inst)
                {
                    parent.appendChild(inst);
                })
            }
            return this.composeAll(templateInstance, data);
        }) as any;
        f.hotReplace = function (markup: string)
        {
            template = Interpolate.build(markup);
        }

        return f;
    }

    static async composeAll(items: ArrayLike<HTMLElement>, data, root?: Element, options?: { [key: string]: any }): Promise<IControlInstance<any>[]>
    {
        const result: IControlInstance<any>[] = [];
        return await akala.eachAsync(this.composers, (composer) =>
        {
            return this.compose(composer, items, data, root, options && options[composer.optionName]).then(instances => result.push(...instances));
        }, true).then(() => result);
    }

    static async compose(composer: Composer, items: ArrayLike<HTMLElement>, data, root?: Element, options?: any): Promise<IControlInstance<any>[]>
    {
        data.$new = Scope.prototype.$new;
        const instances: IControlInstance<any>[] = [];
        if (filter(items, composer.selector).length == 0)
        {
            await akala.eachAsync(items, async function (el)
            {
                await akala.eachAsync(el.querySelectorAll(composer.selector), async function (el: HTMLElement)
                {
                    const closest = el.parentElement && el.parentElement.closest(composer.selector);
                    let applyInnerTemplate = !!closest || !root;
                    if (!applyInnerTemplate && root)
                        applyInnerTemplate = applyInnerTemplate || root == closest;
                    if (applyInnerTemplate)
                    {
                        instances.push(...await Template.compose(composer, [el], data, el, options && options[composer.optionName]));
                    }
                }, false);
            }, false);
            return instances;
        }
        else
        {
            const promises: PromiseLike<void>[] = [];
            akala.eachAsync(filter(items, composer.selector), function (item)
            {
                promises.push(composer.apply(item, data, options).then(c => { instances.push(...c) }));
            }, false);
            if (promises.length)
                return Promise.all(promises).then(x => instances);
            // return element;
        }

        return instances;
    }
}

export function filter<T extends Element = Element>(items: ArrayLike<T>, filter: string)
{
    return akala.grep(items, function (element)
    {
        return element.matches(filter);
    })
}