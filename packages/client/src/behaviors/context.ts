import { Binding, Parser, each } from "@akala/core";
import { IScope } from "../clientify.js";
import { Composer } from "../template.js";

type Scope = IScope<object>;

export class DataContext implements Composer<Scope>
{
    constructor(private scope: Scope) { }

    readonly selector: string = '[data-context]';
    readonly optionName: string = '$rootScope';
    apply(item: HTMLElement, options?: Scope): Disposable
    {
        if (item.dataset['context'] == this.optionName || item.dataset['context'] === '')
            item['dataContext'] = new Binding(options || this.scope, null);
        else
        {
            let binding: Binding<Scope>;
            const closest = DataContext.find(item.parentElement);
            if (closest)
                binding = closest.pipe(Parser.parameterLess.parse(item.dataset.context))
            else
                binding = new Binding(options || this.scope, Parser.parameterLess.parse(item.dataset.context));

            const sub = binding.onChanged(() =>
            {
                item.dispatchEvent(new Event('dataContextHolderChanged'));
            })
            item['dataContext'] = binding;

            return { [Symbol.dispose]() { sub() } };
        }

    }

    public static get(element: HTMLElement): Binding<Scope>
    {
        return element['dataContext'];
    }

    public static find(element: HTMLElement): Binding<Scope>
    {
        let result = DataContext.get(element);
        if (result)
            return result;
        const parent = element.closest<HTMLElement>('[data-context]');
        if (parent)
            return DataContext.get(parent);
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
    apply(item: HTMLElement)
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
                if (p[0] === '')
                    DataBind.extend(item, ev.value);
                else
                    item[p[0]] = ev.value;
            })
            if (dataContext.getValue())
            {
                if (p[0] === '')
                    Object.assign(item, binding.getValue());
                else
                    item[p[0]] = binding.getValue();
            }
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