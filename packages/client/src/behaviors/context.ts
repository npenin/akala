import { Binding, Parser, each } from "@akala/core";
import { IScope } from "../scope.js";
import { Composer } from "../template.js";

type Scope = IScope<object>;

export class DataContext implements Composer<Scope>
{
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

            item['dataContext'] = binding;

            return binding;
        }

    }

    public static get(element: HTMLElement | ShadowRoot): Binding<Scope>
    {
        return element['dataContext'];
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
                return DataContext.get(parent);
        }
        return null;
    }
}

export class DataBind implements Composer<void>
{
    private scope: Binding<Scope>;

    constructor(scope: Scope)
    {
        if (scope)
            this.scope = new Binding(scope, null);
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

    selector = '[data-bind]';
    optionName = 'databind';
    apply(item: HTMLElement, options: unknown, root: Element | ShadowRoot)
    {
        let bindings: Record<string, Binding<unknown>>;

        const properties = Object.entries(item.dataset).filter(e => e[0].startsWith('bind') && e[1]).map(e => [e[0].substring(4).replace(/^[A-Z]/, m => m.toLowerCase()), e[1]]);

        const exps = Object.fromEntries(properties.map(p => [p[0], Parser.parameterLess.parse(p[1])]));
        const dataContext = DataContext.find(item) || this.scope;

        bindings = Object.fromEntries(properties.map(p =>
        {
            const binding = dataContext.pipe(exps[p[0]]);
            binding.onChanged(ev =>
            {
                if (!ev.value)
                    return;
                if (p[0] === '')
                    DataBind.extend(item, ev.value);
                else
                    item[p[0]] = ev.value;
            }, true)
            return [p[0], binding]
        }));

        return {
            [Symbol.dispose]()
            {
                Object.values(bindings).forEach(binding => binding[Symbol.dispose]());
            }
        }
    }
}