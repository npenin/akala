import { Binding, ObservableObject, Parser, Subscription, each } from "@akala/core";
import { IScope } from "../scope.js";
import { Composer } from "../template.js";
import { AttributeComposer } from "./shared.js";

type Scope = IScope<object>;

export class DataContext implements Composer<Scope>
{
    private static readonly dataContextExpression = Parser.parameterLess.parse('dataContext');

    constructor(private scope: Scope) { }

    readonly selector: string = '[data-context]';
    readonly optionName: string = '$rootScope';
    apply(item: HTMLElement, options?: Scope, root?: HTMLElement | ShadowRoot): Disposable
    {
        if (item.dataset['context'] == this.optionName || item.dataset['context'] === '')
            item['dataContext'] = new Binding(options || this.scope, null);
        else
        {
            let binding: Binding<Scope>;
            const closest = DataContext.find(item.parentElement || root);
            if (closest)
                binding = closest.pipe(Parser.parameterLess.parse(item.dataset.context))
            else
                binding = new Binding(options || this.scope, Parser.parameterLess.parse(item.dataset.context));

            binding.onChanged(() =>
            {
                item.dispatchEvent(new Event('dataContextHolderChanged'));
            })

            item['dataContext']?.[Symbol.dispose]();

            ObservableObject.setValue(item, DataContext.dataContextExpression, binding);
            // item['dataContext'] = binding;

            return binding;
        }

    }

    public static get(element: HTMLElement | ShadowRoot, alwaysDefined: true): Binding<Scope>
    public static get(element: HTMLElement | ShadowRoot, alwaysDefined?: false): Binding<Scope> | undefined
    public static get(element: HTMLElement | ShadowRoot, alwaysDefined?: boolean): Binding<Scope> | undefined
    {
        return element['dataContext'] || alwaysDefined && new Binding(element, this.dataContextExpression);
    }

    public static find(element: HTMLElement | ShadowRoot): Binding<Scope>
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
        return {
            controller: options, get context() { return DataContext.find(item) }
        };
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
        else
            item[subItem as any] = value;
    }
}