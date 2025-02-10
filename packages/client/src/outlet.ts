import { Router, RouterRequest as Request } from './router.js'
import { Template } from './template.js'
import { Scope } from './scope.js'
import { service } from './common.js'
import { LocationService as Location } from './locationService.js'
import { Event, EventEmitter, EventOptions, SimpleInjector, Subscription, map } from '@akala/core'

export type PartInstance = { scope: Scope<object>, element: HTMLElement | ShadowRoot };
export const outletDefinition = Symbol()

@service('$outlet', '$template', '$router', '$location')
export class OutletService 
{
    private routers: { [key: string]: Router } = {};

    public static onLoad = Symbol('onLoad');

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

    public unregister(partName: string)
    {
        this.parts.unregister(partName);
        delete this.routers[partName];
    }

    public async apply<TScope extends Scope<object>>(partInstance: () => PartInstance, part: OutletDefinition<TScope>, params: unknown): Promise<Disposable>
    {
        const template = this.template;
        if (part?.template)
            // eslint-disable-next-line no-var
            var tpl = await template.get(part.template);

        const p = partInstance();
        if (!p)
            return;
        let controller: Partial<Disposable & { templateReloaded(): void }>;
        let templateInstance: Partial<Disposable>;
        if (part?.controller)
            controller = part.controller(p.scope as TScope, p.element, params);
        if (tpl)
        {
            const sub = tpl.watch(p.scope, async () =>
            {
                if (templateInstance)
                    templateInstance[Symbol.dispose]?.();
                p.element.replaceChildren();
                templateInstance = tpl(p.scope, p.element, controller);

                controller?.[OutletService.onLoad]?.();
            }, true)

            if (controller)
            {
                const oldController = controller;
                return {
                    [Symbol.dispose]()
                    {
                        if (oldController[Symbol.dispose])
                            oldController[Symbol.dispose]();
                        sub();
                    }
                }
            }
        }
        else
            return Promise.reject();
    }

    public use(url: string): OutletService
    public use<TScope extends Scope<object>>(url: string, partName: string, part: OutletDefined<TScope> | OutletDefinition<TScope>): void
    public use<TScope extends Scope<object>>(url: string, partName = 'body', part?: OutletDefined<TScope> | OutletDefinition<TScope>): OutletService | void
    {
        if (!part)
        {
            const partService = new OutletService(this.template, new Router(), this.location);
            partService.parts = new SimpleInjector(this.parts);

            return partService;
        }
        if (!this.routers[partName])
            this.routers[partName] = new Router();
        this.routers[partName].use(url, (req: Request) =>
        {
            console.log('apply part ' + partName + ' for url ' + url);
            return this.apply(() => this.parts.resolve(partName), part[outletDefinition] || part, req.params);
        });
    }
}

export interface OutletDefined<TScope extends Scope<object>>
{
    [outletDefinition]: OutletDefinition<TScope>;
}

export interface OutletDefinition<TScope extends Scope<object>>
{
    template?: string | Promise<string>;
    controller?(scope: TScope, element: HTMLElement | ShadowRoot, params: unknown): { [Symbol.dispose]?(): void, templateReloaded?(): void };
}

export class OutletDefinitionBuilder<TScope extends Scope<object>> implements OutletDefinition<TScope>
{
    constructor(private commandActions?: EventEmitter<Record<string, Event<[unknown]>>>)
    {
    }

    template?: string | Promise<string>;
    controller?(scope: TScope, element: HTMLElement | ShadowRoot, params: unknown): { [Symbol.dispose]?(): void };
    private controllerCommands: EventEmitter<Record<string, Event<[unknown]>>>

    useTemplate(template?: string | Promise<string>)
    {
        this.template = template;

        return this;
    }

    useController(controller: (scope: TScope, element: HTMLElement | ShadowRoot, params: unknown) => { [Symbol.dispose]?(): void })
    {
        if (this.controllerCommands)
            throw new Error('cannot use both controller and commandResult');
        this.controller = controller;
    };

    useCommandResult(commandName: string, handler: (result: unknown) => void | Promise<void>, options?: EventOptions<Event<[]>>)
    {
        if (!this.controllerCommands && this.controller)
            throw new Error('cannot use both controller and commandResult');

        if (!this.controller)
        {
            this.useController(() =>
            {
                let subscriptions: Subscription[] = Object.values(this.controllerCommands.definedEvents).map(e =>
                    this.commandActions.on(e, (...args) => this.controllerCommands.emit(e, ...args))
                )

                return {
                    [Symbol.dispose]()
                    {
                        subscriptions.forEach(s => s());
                    }
                }
            })
        }

        if (!this.controllerCommands)
            this.controllerCommands = new EventEmitter<Record<string, Event<[unknown]>>>

        this.controllerCommands.on(commandName, handler, options);
        return this;
    }
}