import { Router, RouterRequest as Request } from './router.js'
import './controls/part.js'
import { Template } from './template.js'
import { IScope } from './scope.js'
import { service } from './common.js'
import { LocationService as Location } from './locationService.js'
import { SimpleInjector, each, map } from '@akala/core'
import { IControlInstance } from './controls/control.js'

export type PartInstance = { scope: IScope<object>, element: HTMLElement, controlsInPart?: IControlInstance<unknown>[] };

@service('$outlet', '$template', '$router', '$location')
export class OutletService 
{
    private routers: { [key: string]: Router } = {};

    constructor(private template: Template, router: Router, private location: Location)
    {
        location.on('changing', () =>
        {
            const parts = this.parts;
            parts.keys().forEach(function (partName)
            {
                if (partName == '$injector')
                    return;
                (<PartInstance>parts.resolve(partName)).element.replaceChildren();
            })
        })

        router.use((req) =>
        {
            return Promise.all(map(this.routers, router => router.process(req).catch(function (error)
            {
                if (error)
                    console.error(error);
            }), true));
        })
    }

    private parts = new SimpleInjector();

    public register(partName: string, control: PartInstance)
    {
        const parts = this.parts;
        parts.register(partName, control);
        if (!this.routers[partName])
            this.routers[partName] = new Router();
        this.location.refresh();
    }

    public async apply<TScope extends IScope<object>>(partInstance: () => PartInstance, part: PartDefinition<TScope>, params: unknown): Promise<void>
    {
        const template = this.template;
        if (part && part.template)
            // eslint-disable-next-line no-var
            var tpl = await template.get(part.template);

        const p = partInstance();
        if (!p)
            return;
        if (part && part.controller)
            await part.controller(p.scope as unknown as TScope, p.element, params);
        if (tpl)
        {
            tpl.watch(p.scope, async () =>
            {
                p.element.replaceChildren();
                if (p.controlsInPart)
                    each(p.controlsInPart, c => c.dispose());
                p.controlsInPart = await tpl(p.scope, p.element);
            }, true)
        }
        else
            return Promise.reject();
    }

    public use(url: string): OutletService
    public use<TScope extends IScope<object>>(url: string, partName: string, part: PartDefinition<TScope>): void
    public use<TScope extends IScope<object>>(url: string, partName = 'body', part?: PartDefinition<TScope>): OutletService | void
    {
        if (!part)
        {
            const partService = new OutletService(this.template, new Router(), this.location);
            partService.parts = new SimpleInjector(this.parts);

            return partService;
        }
        if (!this.routers[partName])
            this.routers[partName] = new Router();
        const route = this.routers[partName].route(url);
        route.use((req: Request) =>
        {
            console.log('apply part ' + partName + ' for url ' + url);
            return this.apply(() => this.parts.resolve(partName), part, req.params);
        });
    }
}

export interface PartDefinition<TScope extends IScope<object>>
{
    template?: string | Promise<string>;
    controller?(scope: TScope, element: Element, params: unknown): Promise<void>;
}