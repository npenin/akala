import { Binding, ExpressionsWithLength, ObservableObject, Parser, Subscription, each } from "@akala/core";
import { IScope } from "../scope.js";
import { Composer } from "../template.js";
import { AttributeComposer } from "./shared.js";
import { ConstantExpression, MemberExpression, NewExpression } from "@akala/core/expressions";
// import { MemberExpression, NewExpression } from "@akala/core/expressions";

type Scope = IScope<object>;

export type IDataContext<TController extends Partial<Disposable> = Partial<Disposable>> = { context: Scope, controller: TController };

export class DataContext implements Composer<IDataContext>
{
    static readonly propagateProperties: string[] = ['controller'];

    static define(item: Element | ShadowRoot, context: object): void
    {
        DataContext.defineDirect(item, DataContext.extend(DataContext.find(item), context))
    }

    static defineDirect(item: Element | ShadowRoot, context: Binding<IDataContext>): void
    {
        if (!item['dataContext'])
            item['dataContext'] = context;
        if (item instanceof HTMLElement)
            item.setAttribute('data-context', '');
    }
    static extend(sourceContext: Binding<IDataContext>, options: object, newContextPath?: string): Binding<IDataContext>
    {
        if (sourceContext.expression?.type == 'new' && sourceContext.expression.newType == '{')
        {
            return sourceContext.pipe(new NewExpression<{ context: any, controller: Partial<Disposable> }>(
                ...Object.entries(options).filter(e => e[0] !== 'context').map(e =>
                    new MemberExpression<any, any, any>(new ConstantExpression(e[1]), new ConstantExpression(e[0]), false)),
                ...sourceContext.expression.init,
                new MemberExpression(Parser.parameterLess.parse(newContextPath || 'context') as any, new ConstantExpression('context'), false),
            ), false);
        }
        return sourceContext.pipe(new NewExpression<{ context: any, controller: Partial<Disposable> }>(
            ...Object.entries(options).filter(e => e[0] !== 'context').map(e =>
                new MemberExpression<any, any, any>(new ConstantExpression(e[1]), new ConstantExpression(e[0]), false)),
            ...DataContext.propagateProperties.filter(p => !(p in options)).map(e =>
                new MemberExpression<any, any, any>(new MemberExpression(null, new ConstantExpression(e), false), new ConstantExpression(e), false)),
            new MemberExpression(Parser.parameterLess.parse(newContextPath || 'context') as any, new ConstantExpression('context'), false),
        ), false);
    }

    private static readonly dataContextExpression = Parser.parameterLess.parse('dataContext');

    constructor() { }

    readonly selector: string = '[data-context]';

    optionGetter(options: object): { context: Scope; controller: Partial<Disposable>; }
    {
        return { context: options['$rootScope'], controller: options['controller'], ...options };
    }

    apply(item: HTMLElement, options?: { context: Scope, controller: Partial<Disposable> }, root?: HTMLElement | ShadowRoot): Disposable
    {
        if (item.dataset.context == '$rootScope' || item.dataset.context === '')
        {
            if (item['dataContext'])
                return item['dataContext'];
            return item['dataContext'] = new Binding(options, null);
        }
        else
        {
            let binding: Binding<{ context: Scope }>;
            const closest = DataContext.find(item.parentElement || root);
            if (closest)
                binding = DataContext.extend(closest, options, item.dataset.context);
            else
                binding = new Binding(options, Parser.parameterLess.parse(item.dataset.context));

            // binding.onChanged(() =>
            // {
            //     item.dispatchEvent(new Event('dataContextHolderChanged'));
            // })

            item['dataContext']?.[Symbol.dispose]();

            ObservableObject.setValue(item, DataContext.dataContextExpression, binding);
            // item['dataContext'] = binding;

            return binding;
        }

    }

    public static get<T = unknown>(element: Element | ShadowRoot, alwaysDefined: true): Binding<IDataContext & T>
    public static get<T = unknown>(element: Element | ShadowRoot, alwaysDefined?: false): Binding<IDataContext & T> | undefined
    public static get<T = unknown>(element: Element | ShadowRoot, alwaysDefined?: boolean): Binding<IDataContext & T> | undefined
    {
        const selfContext = element['dataContext'];
        if (selfContext)
            return selfContext;
        if (alwaysDefined)
            return Binding.defineProperty<IDataContext & T>(element, 'dataContext')
    }

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

export interface DataBindPlugin
{
    selector: string;
    getBindings<const TKey extends PropertyKey>(item: Element, binding: Binding<unknown>, context: Binding<unknown>, member: TKey, source: ExpressionsWithLength): Subscription;
}

export class DataBind<T extends Partial<Disposable>> extends AttributeComposer<T> implements Composer<T>
{
    public static readonly plugins: DataBindPlugin[] = [];

    constructor()
    {
        super('data-bind');
    }

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

    getContext(item: HTMLElement, options?: T)
    {
        return DataContext.find(item);
    }

    optionName = 'controller';

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
        return () => subs.forEach(sub => sub && sub());
    }

    apply(item: HTMLElement, options: T, root: Element | ShadowRoot): { [Symbol.dispose](): void; }
    {
        item['controller'] = options;
        return super.apply(item, options, root);
    }

    getBindings<const TKey extends PropertyKey>(item: Element, options: T, context: Binding<unknown>, member: TKey, source: ExpressionsWithLength): readonly [TKey, Binding<Record<string, (...args: unknown[]) => unknown> | ((...args: unknown[]) => unknown)>]
    {
        const result = super.getBindings(item, options, context, member, source);

        const subs = DataBind.plugins.map(plugin => plugin.getBindings(item, result[1], context, member, source));
        result[1].on(Symbol.dispose, () => subs.forEach(s => s?.()));

        return result;
    }

    applyInternal<const TKey extends PropertyKey>(item: Element, options: T, subItem: TKey, value: unknown): Subscription | void
    {
        return DataBind.applyInternal(item, subItem, value);
    }

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