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
    private static readonly dataContextExpression = Parser.parameterLess.parse('dataContext');

    constructor() { }

    readonly selector: string = '[data-context]';

    optionGetter(options: object): { context: Scope; controller: Partial<Disposable>; }
    {
        return { context: options['$rootScope'], controller: options['controller'] };
    }

    apply(item: HTMLElement, options?: { context: Scope, controller: Partial<Disposable> }, root?: HTMLElement | ShadowRoot): Disposable
    {
        if (item.dataset.context == '$rootScope' || item.dataset.context === '')
            return item['dataContext'] = new Binding(options, null);
        else
        {
            let binding: Binding<Scope>;
            const closest = DataContext.find(item.parentElement || root);
            if (closest)
                binding = closest.pipe(new NewExpression<{ context: any, controller: Partial<Disposable> }>(
                    new MemberExpression(Parser.parameterLess.parse(item.dataset.context) as any, new ConstantExpression('context'), false),
                    new MemberExpression(new ConstantExpression(options.controller) as any, new ConstantExpression('controller'), false),
                ));
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
            else
                DataBind.extend(target[key] as any, value);
        });
    }

    getContext(item: HTMLElement, options?: T)
    {
        return new Binding(DataContext.find(item), new NewExpression<{ context: any, controller: T }>(
            new MemberExpression(new MemberExpression(undefined, new ConstantExpression('context'), false), new ConstantExpression('context'), false),
            new MemberExpression(new ConstantExpression(options) as any, new ConstantExpression('controller'), false),
        ));
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