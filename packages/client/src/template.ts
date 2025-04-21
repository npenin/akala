import { service } from './common.js'
import { Binding, Event, EventEmitter, Http, Injector, Interpolate, Parser, SimpleInjector, Subscription, each, grep, map } from '@akala/core';

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

/** 
 * Function type for rendering and managing template instances.
 * @template T - Type of the controller object.
 * @param target - Data context object for template interpolation.
 * @param parent - Parent DOM element or shadow root to append template elements.
 * @param controller - Controller object for managing template lifecycle.
 * @returns Disposable instance to clean up template bindings.
 */
export interface templateFunction
{
    <T extends Partial<Disposable>>(target: object, parent: HTMLElement | ShadowRoot, controller: T): Disposable;
    /**
     * Replace the current template with new markup.
     * @param markup - New template string to compile and render.
     */
    hotReplace(markup: string): void;
    /**
     * Watch for data changes and trigger re-renders.
     * @param target - Data object to observe.
     * @param handler - Callback executed when data changes.
     * @param trigger - Whether to invoke handler immediately.
     * @returns Subscription to stop watching.
     */
    watch(target: object, handler: () => void, trigger?: boolean): Subscription;
}

/** 
 * Defines a DOM composition strategy for template elements.
 * @template TOptions - Type of configuration options.
 */
export interface Composer<TOptions = unknown>
{
    /**
     * CSS selector(s) identifying elements this composer applies to.
     */
    selector: string | string[];
    /**
     * Extracts configuration options from a parent context.
     * @param options - Parent configuration object.
     * @returns Parsed configuration options for this composer.
     */
    optionGetter(options: object): TOptions;
    /**
     * Applies composition logic to selected elements.
     * @param items - Elements to compose.
     * @param options - Configuration options.
     * @param futureParent - Target container for composed elements.
     * @returns Disposable to manage composition lifecycle.
     */
    apply(items: Element, options?: TOptions, futureParent?: Element | DocumentFragment): Disposable;
}


export function composer(selector: string, optionName?: string): ClassDecorator
export function composer(selector: (new () => Composer)): void
export function composer(selector: Composer): void
/**
 * Registers a new template composition strategy.
 * @param selector - Selector string, composer class, or composer instance
 * @param optionName - Property name for configuration options (only when selector is string)
 */
export function composer(selector: string | Composer | (new () => Composer), optionName?: string)
{
    switch (typeof selector)
    {
        case 'string':
            return function (composingFunction: (items: HTMLElement, data) => Disposable)
            {
                Template.composers.push({ selector: selector, optionGetter: (options) => options[optionName], apply: composingFunction });
            };
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
@service('$template', '$interpolate', '$http', '$injector')
/**
 * Central class managing template rendering and composition.
 * Responsible for template fetching, interpolation, and composer orchestration.
 */
export class Template
{
    /**
     * Registered DOM behavior composers.
     * @type {Composer[]}
     */
    public static composers: Composer[] = [];

    /**
     * Template service constructor.
     * @param interpolator - Handles expression interpolation in templates
     * @param http - HTTP client for loading external templates
     * @param templateInjector - Dependency injector for template options resolution
     */
    constructor(
        private interpolator: Interpolate,
        private http: Http,
        private templateInjector: Injector
    ) { }

    /**
     * Enables hot template reloading during development
     */
    public enableHotReplacement: boolean;
    /**
     * Retrieves and caches template functions.
     * @param t - Template URL or markup string
     * @param registerTemplate - Whether to cache the result
     * @returns Resolved template function
     */
    public async get(t: string | PromiseLike<string>, registerTemplate = true): Promise<templateFunction>
    {
        const http = this.http;
        const text = await Promise.resolve(t);

        if (!text)
            return null;

        let template = cache.resolve<templateFunction | PromiseLike<templateFunction>>(text);
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
                const response = await http.get(text);
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
        return map(root.children, (el) => el as HTMLElement);
    }

    public build(markup: string): templateFunction
    {
        let template = this.interpolator.build(markup);
        let disposable: Disposable;
        const f: templateFunction = (<T extends Partial<Disposable>>(
            data: object,
            parent: HTMLElement | ShadowRoot | undefined,
            controller: T
        ) =>
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
                    confirm('Template has changed - reload to see updates');
                }
                templateInstance = newTemplateInstance;
                disposable[Symbol.dispose]();
                disposable = Template.composeAll(templateInstance, null, { controller, ...this.templateInjector.resolve('templateOptions') });
            }

            var templateInstance = Template.buildElements(template(data));
            if (parent)
            {
                each(templateInstance, function (inst)
                {
                    parent.appendChild(inst);
                })
            }
            return disposable = Template.composeAll(templateInstance, null, { controller, ...this.templateInjector.resolve('templateOptions') });
        }) as templateFunction;

        f.hotReplace = async (markup: string) =>
        {
            template = this.interpolator.build(markup);
        };

        let bindings: Subscription[];

        const watcher = new EventEmitter<{
            change: Event<[]>;
        }>();

        f.watch = (data: object, handler: () => void, trigger?: boolean) =>
        {
            bindings = template.expressions.map(
                (exp) =>
                    new Binding(data, new Parser().parse(exp)).onChanged(() => watcher.emit('change'))
            );
            const sub = watcher.on('change', handler);
            if (trigger)
                handler();
            return sub;
        };

        return f;
    }

    /**
     * Applies all registered composers to a collection of elements.
     * @param items - Elements to process
     * @param root - Context container for composition
     * @param options - Global configuration options
     * @returns Combined disposable for all compositions
     */
    static composeAll(items: ArrayLike<Element>, root?: Element | DocumentFragment, options?: object): Disposable
    {
        return new CompositeDisposable(
            map(this.composers, (composer) =>
                this.compose(
                    composer,
                    items,
                    root,
                    options && composer.optionGetter
                        ? composer.optionGetter(options)
                        : undefined
                )
            )
        );
    }

    /**
     * Applies a specific composer to elements.
     * @param composer - Composition strategy to use
     * @param items - Elements to process
     * @param root - Composition context container
     * @param options - Configuration options for the composer
     * @returns Combined disposable for all compositions
     */
    static compose<TOptions>(
        composer: Composer<TOptions>,
        items: ArrayLike<Element>,
        root?: Element | DocumentFragment,
        options?: TOptions
    ): Disposable
    {
        const selector = typeof composer.selector === 'string'
            ? composer.selector
            : composer.selector.join(',');
        const disposables: Disposable[] = [];
        const directlyComposable = filter(items, composer.selector);

        each(items, (el) =>
        {
            if (!el || directlyComposable.includes(el))
                return;
            each(el.querySelectorAll(selector), el =>
            {
                const closest = el.parentElement?.closest(selector);
                let applyInnerTemplate = !!closest || !root;
                if (!applyInnerTemplate && root)
                    applyInnerTemplate = root === closest;
                if (applyInnerTemplate)
                {
                    disposables.push(
                        Template.compose(composer, [el], el, options)
                    );
                }
            });
        });

        each(directlyComposable, (item) =>
        {
            disposables.push(composer.apply(item, options, root));
        });

        return new CompositeDisposable(disposables);
    }

}

/**
 * Manages multiple disposables as a single unit.
 */
export class CompositeDisposable implements Disposable
{
    constructor(private disposables: Disposable[]) { }

    /**
     * Disposes all contained disposables.
     */
    [Symbol.dispose](): void
    {
        this.disposables.forEach((d) => d?.[Symbol.dispose]());
    }
}

/**
 * Filters elements matching given selectors.
 * @param items - Elements to filter
 * @param selectors - CSS selectors to match
 * @returns Elements matching the selectors
 */
export function filter<T extends Element = Element>(
    items: ArrayLike<T>,
    selectors: string | string[]
): T[]
{
    return grep(items, (element) =>
    {
        if (element instanceof DocumentFragment) return false;
        if (typeof selectors === 'string')
            return element?.matches(selectors);
        return selectors.some((selector) => element.matches(selector));
    });
}
