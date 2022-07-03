import * as akala from '@akala/core'
import { Router, RouterRequest as Request } from './router'
import { EventEmitter } from 'events'
import './controls/part'
import { Template } from './template'
import { IScope } from './scope'
import { service } from './common'
import { LocationService as Location } from './locationService'
import { Injector, map } from '@akala/core'
import { IControlInstance } from './controls/control'

export type PartInstance = { scope: IScope<unknown>, element: HTMLElement, controlsInPart?: IControlInstance<unknown>[] };

@service('$part', '$template', '$router', '$location')
export class Part extends EventEmitter
{
    private routers: { [key: string]: Router } = {};

    constructor(private template: Template, router: Router, private location: Location)
    {
        super();
        location.on('changing', () =>
        {
            const parts = this.parts;
            parts.keys().forEach(function (partName)
            {
                if (partName == '$injector')
                    return;
                (<PartInstance>parts.resolve(partName)).element.textContent = '';
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

    private parts = new akala.Injector();

    public register(partName: string, control: PartInstance)
    {
        const parts = this.parts;
        parts.register(partName, control);
        if (!this.routers[partName])
            this.routers[partName] = new Router();
        this.location.refresh();
    }

    public async apply<TScope extends IScope<unknown>>(partInstance: () => PartInstance, part: PartDefinition<TScope>, params: unknown): Promise<void>
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
            p.element.textContent = '';
            if (p.controlsInPart)
                setImmediate(() => akala.each(p.controlsInPart, c => c.dispose()));
            await tpl(p.scope, p.element).then(instances => p.controlsInPart = instances);
        }
        else
            return Promise.reject();
    }

    public use(url: string): Part
    public use<TScope extends IScope<unknown>>(url: string, partName: string, part: PartDefinition<TScope>): void
    public use<TScope extends IScope<unknown>>(url: string, partName = 'body', part?: PartDefinition<TScope>): Part | void
    {
        if (!part)
        {
            const partService = new Part(this.template, new Router(), this.location);
            partService.parts = new Injector(this.parts);

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

export interface PartDefinition<TScope extends IScope<unknown>>
{
    template?: string | Promise<string>;
    controller?(scope: TScope, element: Element, params: unknown): Promise<void>;
}