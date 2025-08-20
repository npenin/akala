import { Binding, EmptyBinding, ObservableObject, Parser, type Subscription, combineSubscriptions, each } from "@akala/core";
import type { IScope } from "../scope.js";
import type { Composer } from "../template.js";
import { AttributeComposer } from "./shared.js";
import { ConstantExpression, type Expressions, ExpressionType, ExpressionUpdater, MemberExpression, NewExpression, ParameterExpression, TypedExpression } from "@akala/core/expressions";
import { a } from "../dom-helpers.js";
// import { MemberExpression, NewExpression } from "@akala/core/expressions";

type Scope = IScope<object>;

export type IDataContext<TController extends Partial<Disposable> = Partial<Disposable>> = { context: Scope, controller: TController };

/**
 * @class DataContext
 * @implements {Composer<IDataContext>}
 * @description Manages and propagates data contexts within a DOM tree.
 */
export class DataContext implements Composer<IDataContext>
{
    /**
     * @readonly
     * @static
     * @description Properties that should be propagated.
     */
    static readonly propagateProperties: string[] = ['controller'];

    /**
     * @static
     * @description Defines a data context for the given item and context.
     * @param {Element | ShadowRoot} item - The DOM element or shadow root to define the context for.
     * @param {object} context - The context to define.
     */
    static define(item: Element | ShadowRoot): Binding<IDataContext>
    static define<T = unknown>(item: Element | ShadowRoot, context?: T, newContextPath?: string | TypedExpression<any>): Binding<IDataContext & T>
    static define<T = unknown>(item: Element | ShadowRoot, context?: T, newContextPath?: string | TypedExpression<any>): Binding<IDataContext & T>
    {
        const dataContext = DataContext.extend<T>(DataContext.find(item), context, newContextPath);
        DataContext.defineDirect(item, dataContext);
        return dataContext;
    }

    /**
     * @static
     * @description Directly defines a data context for the given item and context.
     * @param {Element | ShadowRoot} item - The DOM element or shadow root to define the context for.
     * @param {Binding<IDataContext>} context - The context to define.
     */
    static defineDirect(item: Element | ShadowRoot, context: Binding<IDataContext>): void
    {
        if (!item['dataContext'])
            item['dataContext'] = context;
        if (item instanceof HTMLElement && !a(item, 'data-context'))
            a(item, 'data-context', '');
    }

    /**
     * @static
     * @description Extends the source context with additional options and a new context path.
     * @param {Binding<IDataContext>} sourceContext - The source context to extend.
     * @param {object} options - Additional options to extend the context with.
     * @param {string} [newContextPath] - The new context path.
     * @returns {Binding<IDataContext>} The extended context.
     */
    static extend<T>(sourceContext: Binding<IDataContext>): Binding<IDataContext>
    static extend<T = unknown>(sourceContext: Binding<IDataContext>, options?: T, newContextPath?: string | TypedExpression<any>): Binding<IDataContext & T>
    static extend<T = unknown>(sourceContext: Binding<IDataContext>, options?: object, newContextPath?: string | TypedExpression<any>): Binding<IDataContext & T> | Binding<IDataContext>
    {
        const makeMembers = (options: any) => [
            ...Object.entries(options || {}).filter(([k]) => k !== 'context').map(
                ([k, v]) => new MemberExpression<any, any, any>(new ConstantExpression(v), new ConstantExpression(k), false)
            ),
            ...DataContext.propagateProperties.filter(p => !(options && p in options)).map(
                p => new MemberExpression<any, any, any>(
                    new MemberExpression(null, new ConstantExpression(p), false),
                    new ConstantExpression(p),
                    false
                )
            )
        ];

        const makeContextMember = (options: any, newContextPath?: string | TypedExpression<any>) =>
        {
            if (!newContextPath || typeof newContextPath == 'string' && newContextPath.startsWith('context.'))
            {
                return new MemberExpression<any, any, any>(
                    Parser.parameterLess.parse((newContextPath || 'context') as string) as any,
                    new ConstantExpression('context'),
                    false
                );
            }
            else if (typeof newContextPath == 'string')
            {
                const param = new ParameterExpression();
                const parser = new Parser(param);
                const contextExp = new ExpressionUpdater(param, new ConstantExpression(options || {}))
                    .visit(parser.parse(newContextPath)) as TypedExpression<any>;

                return new MemberExpression(contextExp, new ConstantExpression('context'), false);
            }
            else
                return new MemberExpression(newContextPath, new ConstantExpression('context'), false);
        };

        if (sourceContext.expression?.type === 'new' && sourceContext.expression.newType === '{')
        {
            // Handle new-expression branch with parity
            return sourceContext.pipe(new NewExpression<{ context: any, controller: Partial<Disposable> }>(
                ...makeMembers(options),
                ...sourceContext.expression.init.filter(
                    m => m.member.type == ExpressionType.ConstantExpression && !(options && m.member.value in options) && m.member.value !== 'context'
                ),
                makeContextMember(options, newContextPath),
            ));
        }

        // Default branch (non-new expression)
        return sourceContext.pipe(new NewExpression<{ context: any, controller: Partial<Disposable> }>(
            ...makeMembers(options),
            makeContextMember(options, newContextPath),
        ));
    }


    /**
     * @private
     * @readonly
     * @static
     * @description The data context expression.
     */
    private static readonly dataContextExpression = Parser.parameterLess.parse('dataContext');

    /**
     * @constructor
     * @description Creates an instance of DataContext.
     */
    constructor() { }

    /**
     * @readonly
     * @description The CSS selector for elements with a data context.
     */
    readonly selector: string = '[data-context]';

    /**
     * @description Gets options for the context.
     * @param {object} options - The options to get.
     * @returns {{ context: Scope; controller: Partial<Disposable>; }} The context and controller options.
     */
    optionGetter(options: IDataContext): IDataContext
    {
        const result: IDataContext = { ...options };
        if (!options['context'] && options['$rootScope'])
            result.context = options['$rootScope'];
        return result;
    }

    /**
     * @description Applies the data context to the given item.
     * @param {HTMLElement} item - The item to apply the context to.
     * @param {{ context: Scope, controller: Partial<Disposable> }} [options] - The context options.
     * @param {HTMLElement | ShadowRoot} [root] - The root element or shadow root.
     * @returns {Disposable} The applied context.
     */
    apply(item: HTMLElement, options?: { context: Scope, controller: Partial<Disposable> }, root?: HTMLElement | ShadowRoot): Disposable
    {
        let binding: Binding<IDataContext> = item['dataContext'];
        const closest = DataContext.find(item.parentElement || root);
        if (binding)
            if (closest)
            {
                const oldBinding = binding;
                binding = DataContext.extend(binding, options, item.dataset.context);
                binding.onChanged(ev => oldBinding.canSet && oldBinding.setValue(ev.value), true);
            }
            else
            {
                const oldBinding = binding;
                binding = DataContext.extend(new EmptyBinding(options), null, item.dataset.context);
                binding.onChanged(ev => oldBinding.canSet && oldBinding.setValue(ev.value), true);
            }
        else
            if (closest)
                binding = DataContext.extend(closest, options, item.dataset.context);
            else
                binding = DataContext.extend(new EmptyBinding(options), null, item.dataset.context);

        ObservableObject.setValue(item, DataContext.dataContextExpression, binding);

        return binding;
    }

    /**
     * @description Gets the data context for the given element.
     * @param {Element | ShadowRoot} element - The element to get the context for.
     * @param {true} alwaysDefined - Whether the context should always be defined.
     * @returns {Binding<IDataContext & T>} The data context.
     */
    public static get<T = unknown>(element: Element | ShadowRoot, alwaysDefined: true): Binding<IDataContext & T>
    public static get<T = unknown>(element: Element | ShadowRoot, alwaysDefined?: false): Binding<IDataContext & T> | undefined
    public static get<T = unknown>(element: Element | ShadowRoot, alwaysDefined?: boolean): Binding<IDataContext & T> | undefined
    {
        const selfContext = element['dataContext'];
        if (selfContext)
            return selfContext;
        if (alwaysDefined)
        {
            const binding = new EmptyBinding<IDataContext & T>();
            DataContext.defineDirect(element, binding);
            return binding;
        }
    }

    /**
     * @description Finds the data context for the given element.
     * @param {Element | ShadowRoot} element - The element to find the context for.
     * @returns {Binding<IDataContext>} The found data context.
     */
    public static find(element: Element | ShadowRoot): Binding<IDataContext>
    {
        let result = DataContext.get(element);
        if (result)
            return result;
        if (element instanceof ShadowRoot)
            if (element.host)
                return DataContext.find(element.host);
            else
                return null;
        else
        {
            const parent = element.closest<HTMLElement>('[data-context]');
            if (parent)
                return DataContext.get(parent, true);
            else if (element.getRootNode() instanceof ShadowRoot)
                return DataContext.find(element.getRootNode() as ShadowRoot);
        }
        return null;
    }
}

/**
 * Interface representing a plugin for data binding.
 */
export interface DataBindPlugin
{
    /**
     * The CSS selector used to identify elements that this plugin applies to.
     */
    selector: string;

    /**
     * Retrieves the bindings for a given element.
     *
     * @param item - The DOM element to get bindings for.
     * @param binding - The binding object associated with the element.
     * @param context - The context in which the binding is applied.
     * @param member - The member of the binding to retrieve.
     * @param source - The source expressions with length.
     * @returns A subscription to the bindings.
     */
    getBindings<const TKey extends PropertyKey>(item: Element, binding: Binding<unknown>, context: Binding<unknown>, member: TKey, source: Expressions): Subscription;
}

/**
 * Represents a DataBind class that extends AttributeComposer and implements Composer.
 * This class provides methods for extending objects, binding data to elements, and applying bindings to elements.
 * 
 * @template T - A type that extends Partial<Disposable>.
 */
export class DataBind<T extends Partial<Disposable>> extends AttributeComposer<T> implements Composer<T>
{
    /**
     * An array of DataBindPlugin instances.
     * @type {DataBindPlugin[]}
     */
    public static readonly plugins: DataBindPlugin[] = [];

    /**
     * Creates an instance of DataBind.
     */
    constructor()
    {
        super('data-bind');
    }

    /**
     * Extends the target object with the properties from the extension object.
     * 
     * @template T - A type that extends object.
     * @param {T} target - The target object to extend.
     * @param {Partial<T>} extension - The extension object containing properties to add to the target.
     * @returns {T} - The extended target object.
     * @throws {Error} - Throws an error if a non-string key or value is encountered when extending a NamedNodeMap.
     */
    public static extend<T extends object>(target: T, extension: Partial<T>)
    {
        if (target instanceof NamedNodeMap)
            each(extension, (value, attrName) =>
            {
                if (typeof attrName !== 'string')
                    throw new Error('cannot set a non attribute string key: ' + attrName.toString());
                if (typeof value !== 'string')
                    throw new Error('cannot set a non string to an attribute (' + attrName + '): ' + value.toString());
                const attr = document.createAttribute(attrName);
                attr.value = value;
                target.setNamedItem(attr)
            })
        else
            each(extension, (value, key) =>
            {
                if (typeof value !== 'object' || !target[key])
                    target[key] = value!;
                else
                    DataBind.extend(target[key] as any, value);
            });
        return target;
    }

    /**
     * Gets the data context for the specified HTML element.
     * 
     * @param {HTMLElement} item - The HTML element to get the context for.
     * @param {T} [options] - Optional options to use when getting the context.
     * @returns {DataContext} - The data context for the specified HTML element.
     */
    getContext(item: HTMLElement, options?: T)
    {
        return DataContext.find(item);
    }

    /**
     * The name of the option used for the controller.
     * @type {string}
     */
    optionName = 'controller';

    /**
     * Binds the specified options to the specified element.
     * 
     * @template T - A type that extends object.
     * @param {Element} item - The element to bind the options to.
     * @param {T} options - The options to bind to the element.
     * @returns {() => void} - A function that can be called to dispose of the bindings.
     */
    public static bind<T extends object>(item: Element, options: T)
    {
        const subs = Object.entries(options).flatMap(e =>
        {
            const sub = DataBind.applyInternal(item, e[0], e[1]);
            if (e[1] instanceof Binding)
                return [sub].concat(DataBind.plugins.map(plugin => plugin.getBindings(item, e[1], null, e[0], null)));
            const exp = new MemberExpression<T, keyof T, T[keyof T]>(null, new ConstantExpression(e[0] as keyof T), true);
            const subs = DataBind.plugins.map(plugin => plugin.getBindings(item, new Binding(options, exp), null, e[0], exp));

            return [sub].concat(subs);
        });
        return combineSubscriptions(...subs);
    }

    /**
     * Applies the specified options to the specified HTML element and root element.
     * 
     * @param {HTMLElement} item - The HTML element to apply the options to.
     * @param {T} options - The options to apply to the element.
     * @param {Element | ShadowRoot} root - The root element to apply the options to.
     * @returns {{ [Symbol.dispose](): void }} - An object with a dispose method to clean up the applied options.
     */
    apply(item: HTMLElement, options: T, root: Element | ShadowRoot): { [Symbol.dispose](): void; }
    {
        item['controller'] = options;
        return super.apply(item, options, root);
    }

    /**
     * Gets the bindings for the specified element, options, context, member, and source.
     * 
     * @template TKey - A type that extends PropertyKey.
     * @param {Element} item - The element to get the bindings for.
     * @param {T} options - The options to use when getting the bindings.
     * @param {Binding<unknown>} context - The binding context.
     * @param {TKey} member - The member to get the bindings for.
     * @param {ExpressionsWithLength} source - The source expressions.
     * @returns {readonly [TKey, Binding<Record<string, (...args: unknown[]) => unknown> | ((...args: unknown[]) => unknown)>]} - The bindings for the specified element.
     */
    getBindings<const TKey extends PropertyKey>(item: Element, options: T, context: Binding<unknown>, member: TKey, source: Expressions): readonly [TKey, Binding<Record<string, (...args: unknown[]) => unknown> | ((...args: unknown[]) => unknown)>]
    {
        const result = super.getBindings(item, options, context, member, source);

        const subs = DataBind.plugins.map(plugin => plugin.getBindings(item, result[1], context, member, source));
        result[1].on(Symbol.dispose, combineSubscriptions(...subs));

        return result;
    }

    /**
     * Applies the specified value to the specified sub-item of the specified element.
     * 
     * @template TKey - A type that extends PropertyKey.
     * @param {Element} item - The element to apply the value to.
     * @param {T} options - The options to use when applying the value.
     * @param {TKey} subItem - The sub-item to apply the value to.
     * @param {unknown} value - The value to apply.
     * @returns {Subscription | void} - A subscription or void.
     */
    applyInternal<const TKey extends PropertyKey>(item: Element, options: T, subItem: TKey, value: unknown): Subscription | void
    {
        return DataBind.applyInternal(item, subItem, value);
    }

    /**
     * Applies the specified value to the specified sub-item of the specified element.
     * 
     * @template TKey - A type that extends PropertyKey.
     * @template T - A type parameter.
     * @param {Element} item - The element to apply the value to.
     * @param {TKey} subItem - The sub-item to apply the value to.
     * @param {unknown} value - The value to apply.
     * @returns {Subscription | void} - A subscription or void.
     */
    public static applyInternal<const TKey extends PropertyKey, T>(item: Element, subItem: TKey, value: unknown): Subscription | void
    {
        if (subItem === '')
            DataBind.extend(item, value);
        else if (typeof item[subItem as any] == 'object' && typeof value == 'object')
            DataBind.extend(item[subItem as any], value);
        else if (value instanceof Binding)
            return value.onChanged(ev => DataBind.extend(item, { [subItem as any]: ev.value }), true);
        else
            item[subItem as any] = value;
    }

}
