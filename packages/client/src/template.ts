import { Control, IControlInstance } from './controls/controls.js'
import { Scope } from './scope.js'
import { service } from './common.js'
import { Binding, Event, EventEmitter, Http, Interpolate, ObjectEvent, ObservableObject, Parser, SimpleInjector, Subscription, each, eachAsync, grep, map } from '@akala/core';

// eslint-disable-next-line no-constant-condition
if (MutationObserver && false)
{
    //     const domObserver = new MutationObserver(function (mutations: MutationRecord[])
    //     {
    //         mutations.forEach(function (mutation)
    //         {
    //             switch (mutation.type)
    //             {
    //                 case 'characterData':
    //                     return;
    //                 case 'attributes':
    //                     break;
    //                 case 'childList':
    //                     break;
    //             }
    //         })
    //     })
}

service('$interpolate')(Interpolate)

export interface templateFunction
{
    (target: object, parent: HTMLElement): Promise<IControlInstance<unknown>[]>;
    hotReplace(markup: string): void;
    watch(target: object, handler: () => void, trigger?: boolean): Subscription;
}

export interface Composer<TOptions = unknown>
{
    selector: string;
    optionName: string;
    apply(items: HTMLElement, data, options?: TOptions): Promise<IControlInstance<unknown>[]>;
}


export function composer(selector: string, optionName: string): ClassDecorator
export function composer(selector: (new () => Composer))
export function composer(selector: Composer)
export function composer(selector: string | Composer | (new () => Composer), optionName?: string)
{
    switch (typeof selector)
    {
        case 'string':
            return function (composingFunction: (items: HTMLElement, data) => Promise<IControlInstance<unknown>[]>)
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

const cache = new SimpleInjector();
export { cache as templateCache };
@service('$template', '$interpolate', '$http')
export class Template
{
    public static composers: Composer[] = [];
    constructor(private interpolator: Interpolate, private http: Http) { }

    public enableHotReplacement: boolean;

    public async get(t: string | PromiseLike<string>, registerTemplate = true): Promise<templateFunction>
    {
        const http = this.http;
        const text = await Promise.resolve(t);

        if (!text)
            return null;

        let template = <templateFunction | PromiseLike<templateFunction>>cache.resolve(text);
        if (template)
            return template;
        else if (/</.test(text))
        {
            template = this.build(text);
            return template;
        }
        else
        {
            const internalGet = (async () =>
            {
                const response = await http.get(text)
                const data = await response.text();
                template = this.build(data);
                if (registerTemplate)
                    cache.register(response.url, template, true);
                if (navigator.serviceWorker)
                {
                    //eslint-disable-next-line @typescript-eslint/no-unused-vars
                    navigator.serviceWorker.addEventListener('message', function (msg)
                    //eslint-disable-next-line
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
        return map(root.children, function (el) { return el as HTMLElement });
    }

    public build(markup: string): templateFunction
    {
        let template = this.interpolator.build(markup)
        var f: templateFunction = ((data, parent?: HTMLElement) =>
        {
            f.hotReplace = (markup: string) =>
            {
                template = this.interpolator.build(markup);
                if (bindings?.length)
                {
                    bindings.forEach(b => b());
                    bindings = template.expressions.map(exp => new Binding(data, new Parser().parse(exp)).onChanged(() => watcher.emit('change')));
                }
                const newTemplateInstance = Template.buildElements(template(data));
                if (parent)
                {
                    if (newTemplateInstance.length > templateInstance.length)
                        each(newTemplateInstance, function (inst, i)
                        {
                            if (i < templateInstance.length)
                                parent.replaceChild(inst, templateInstance[i]);
                            else
                                parent.appendChild(inst);
                        })
                    else
                        each(templateInstance, function (inst, i)
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
                Template.composeAll(templateInstance, data, parent);
            }

            var templateInstance = Template.buildElements(template(data));
            if (parent)
            {
                each(templateInstance, function (inst)
                {
                    parent.appendChild(inst);
                })
            }
            return Template.composeAll(templateInstance, data);
        }) as templateFunction;
        f.hotReplace = async (markup: string) =>
        {
            template = this.interpolator.build(markup);
        }

        let bindings: Subscription[];

        const watcher = new EventEmitter<{
            change: Event<[]>;
        }>();

        f.watch = (data, handler, trigger) =>
        {
            bindings = template.expressions.map(exp => new Binding(data, new Parser().parse(exp)).onChanged(() => watcher.emit('change')));
            const sub = watcher.on('change', handler);
            if (trigger)
                handler();
            return sub;
        }

        return f;
    }

    static async composeAll(items: ArrayLike<HTMLElement>, data, root?: Element, options?: { [key: string]: unknown }): Promise<IControlInstance<unknown>[]>
    {
        const result: IControlInstance<unknown>[] = [];
        return await eachAsync(this.composers, async (composer) =>
        {
            await this.compose(composer, items, data, root, options && options[composer.optionName]).then(instances => result.push(...instances));
        }, true).then(() => result);
    }

    static async compose(composer: Composer, items: ArrayLike<HTMLElement>, data, root?: Element, options?: unknown): Promise<IControlInstance<unknown>[]>
    {
        data.$new = Scope.prototype.$new;
        const instances: IControlInstance<unknown>[] = [];
        if (filter(items, composer.selector).length == 0)
        {
            await eachAsync(items, async function (el)
            {
                await eachAsync(el.querySelectorAll(composer.selector), async function (el: HTMLElement)
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
            each(filter(items, composer.selector), function (item)
            {
                promises.push(composer.apply(item, data, options).then(c => { instances.push(...c) }));
            });
            if (promises.length)
                return Promise.all(promises).then(() => instances);
            // return element;
        }

        return instances;
    }
}

export function filter<T extends Element = Element>(items: ArrayLike<T>, filter: string)
{
    return grep(items, function (element)
    {
        return element.matches(filter);
    })
}