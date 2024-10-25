import { Binding, ObservableObject, Parser, Subscription, each } from "@akala/core";
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

    static define(item: HTMLElement | ShadowRoot, context: Record<string, unknown>): void
    {
        if (!item['dataContext'])
            item['dataContext'] = DataContext.extend(DataContext.find(item), context);
        if (item instanceof HTMLElement)
            item.setAttribute('data-context', '');
    }
    static extend(sourceContext: Binding<IDataContext>, options: Record<string, unknown>, newContextPath?: string): Binding<IDataContext>
    {
        return sourceContext.pipe(new NewExpression<{ context: any, controller: Partial<Disposable> }>(
            ...Object.entries(options).filter(e => e[0] !== 'context').map(e =>
                new MemberExpression<any, any, any>(new ConstantExpression(e[1]), new ConstantExpression(e[0]), false)),
            ...DataContext.propagateProperties.filter(p => !(p in options)).map(e =>
                new MemberExpression<any, any, any>(new MemberExpression(null, new ConstantExpression(e), false), new ConstantExpression(e), false)),
            new MemberExpression(Parser.parameterLess.parse(newContextPath || 'context') as any, new ConstantExpression('context'), false),
        ));
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
            return item['dataContext'] = new Binding(options, null);
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

    public static get(element: HTMLElement | ShadowRoot, alwaysDefined: true): Binding<IDataContext>
    public static get(element: HTMLElement | ShadowRoot, alwaysDefined?: false): Binding<IDataContext> | undefined
    public static get(element: HTMLElement | ShadowRoot, alwaysDefined?: boolean): Binding<IDataContext> | undefined
    {
        const selfContext = element['dataContext'];
        if (selfContext)
            return selfContext;
        if (alwaysDefined)
            return Binding.defineProperty<IDataContext>(element, 'dataContext')
    }

    public static find(element: HTMLElement | ShadowRoot): Binding<IDataContext>
    {
        let result = DataContext.get(element);
        if (result)
            return result;
        if (element instanceof ShadowRoot)
            return DataContext.find(element.parentElement);
        else
        {
            const parent = element.closest<HTMLElement>('[data-context]');
            if (parent)
                return DataContext.get(parent, true);
        }
        return null;
    }
}

export class DataBind<T extends Partial<Disposable>> extends AttributeComposer<T> implements Composer<T>
{
    constructor()
    {
        super('data-bind');
    }

    private static extend<T extends object>(target: T, extension: Partial<T>)
    {
        each(extension, (value, key) =>
        {
            if (typeof value !== 'object' || !target[key])
                target[key] = value!;
            else if (target[key] instanceof NamedNodeMap)
                each(value, (value, attrName) =>
                {
                    if (typeof attrName !== 'string')
                        throw new Error('cannot set a non attribute string key: ' + attrName.toString());
                    if (typeof value !== 'string')
                        throw new Error('cannot set a non string to an attribute (' + attrName + '): ' + value.toString());
                    const attr = document.createAttribute(attrName);
                    attr.value = value;
                    (target[key] as NamedNodeMap).setNamedItem(attr)
                })
            else
                DataBind.extend(target[key] as any, value);
        });
    }

    getContext(item: HTMLElement, options?: T)
    {
        return DataContext.find(item);
    }

    optionName = 'controller';

    apply(item: HTMLElement, options: T, root: Element | ShadowRoot): { [Symbol.dispose](): void; }
    {
        item['controller'] = options;
        return super.apply(item, options, root);
    }

    applyInternal<const TKey extends PropertyKey>(item: HTMLElement, options: T, subItem: TKey, value: unknown): Subscription | void
    {
        if (subItem === '')
            DataBind.extend(item, value);
        else if (typeof item[subItem as any] == 'object' && typeof value == 'object')
            DataBind.extend(item[subItem as any], value);
        else
            item[subItem as any] = value;
    }
}