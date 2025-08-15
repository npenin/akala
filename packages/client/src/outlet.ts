import { Router, RouterRequest as Request } from './router.js'
import type { Template, templateFunction } from './template.js'
import { type Scope } from './scope.js'
import { service } from './common.js'
import { LocationService as Location } from './locationService.js'
import { Event, type EventBus, EventBusWrapper, type EventOptions, SimpleInjector, map } from '@akala/core'

/**
 * Represents an instance of a UI part with its associated scope and DOM element.
 */
export type PartInstance = { element: HTMLElement | ShadowRoot };

/**
 * Unique symbol used to identify outlet definitions.
 */
export const outletDefinition = Symbol();

const OutletInjectionToken = Symbol();

@service(OutletInjectionToken, '$template', '$router', '$location')
/**
 * The `OutletService` class provides functionality for managing outlet parts,
 * routing, and applying templates and controllers to specific parts of a web application.
 * It integrates with a router and location service to dynamically update and manage
 * the content of outlet parts based on route changes.
 *
 * ### Features:
 * - Registers and unregisters outlet parts.
 * - Applies templates and controllers to outlet parts.
 * - Handles routing configurations for outlet parts.
 * - Supports dynamic template reloading and controller lifecycle management.
 *
 * ### Example Usage:
 * ```typescript
 * const outletService = new OutletService(template, router, location);
 * outletService.register('header', headerPartInstance);
 * outletService.use('/home', 'header', { template: 'headerTemplate', controller: headerController });
 * ```
 */
export class OutletService
{
    public static readonly InjectionToken = OutletInjectionToken;

    private routers: { [key: string]: Router } = {};

    /**
     * Symbol used to trigger the onLoad event when a template is (re)loaded.
     */
    public static onLoad = Symbol('onLoad');

    constructor(
        private template: Template,
        router: Router,
        private location: Location
    )
    {
        location.on('changing', () =>
        {
            const parts = this.parts;
            parts.keys().forEach((partName) =>
            {
                if (partName === '$injector')
                    return;

                const part = parts.resolve<PartInstance>(partName);
                part.element.replaceChildren();
            });
        });

        router.use((req) =>
        {
            return Promise.all(
                map(this.routers, router => router.process(req).catch(error =>
                {
                    if (error)
                        console.error(error);
                }), true)
            );
        });
    }

    private parts = new SimpleInjector();

    /**
     * Registers a new outlet part with the service.
     * @param partName - Unique identifier for the outlet part
     * @param control - Instance containing scope and DOM element for the part
     */
    public register(partName: string, control: PartInstance)
    {
        this.parts.register(partName, control);
        if (!this.routers[partName])
            this.routers[partName] = new Router();
        this.location.refresh();
    }

    /**
     * Unregisters an existing outlet part.
     * @param partName - Identifier of the part to remove
     */
    public unregister(partName: string): void
    {
        this.parts.unregister(partName);
        delete this.routers[partName];
    }

    /**
     * Applies a template/controller configuration to an outlet part.
     * @param partInstance - Function resolving the target part instance
     * @param part - Outlet configuration defining template/controller
     * @param params - Route parameters to pass to the controller
     * @returns Disposable object to cleanup the applied configuration
     */
    public async apply<TScope extends Scope<object>>(
        partInstance: () => PartInstance,
        part: OutletDefinition<TScope>,
        params: unknown
    ): Promise<Disposable>
    {
        const template = this.template;
        let tpl: templateFunction = null;

        if (part?.template)
        {
            tpl = await template.get(part.template);
        }

        const p = partInstance();
        if (!p)
            return;

        let controller: Partial<Disposable & { templateReloaded(): void }> | undefined;
        let templateInstance: Partial<Disposable>;

        if (part?.controller)
            controller = part.controller(p.element, params);

        if (tpl)
        {
            const sub = tpl.watch(null, async () =>
            {
                if (templateInstance)
                    templateInstance[Symbol.dispose]?.();
                p.element.replaceChildren();
                templateInstance = tpl(null, p.element, controller);
                controller?.[OutletService.onLoad]?.();
            }, true);

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
                };
            }
        }
        else
            return Promise.reject(new Error('No template provided'));
    }

    /**
     * Registers routing configuration for an outlet part.
     * @param url - Route pattern to match
     * @param partName - Target outlet part name (default: 'body')
     * @param part - Outlet configuration (template/controller)
     */
    public use(url: string): OutletService
    public use<TScope extends Scope<object>>(url: string, partName: string, part: OutletDefined<TScope> | OutletDefinition<TScope>): void
    public use<TScope extends Scope<object>>(
        url: string,
        partName: string = 'body',
        part?: OutletDefined<TScope> | OutletDefinition<TScope>
    )
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
            console.log(`Applying part ${partName} for URL ${url}`);
            return this.apply(
                () => this.parts.resolve(partName),
                part[outletDefinition] || part,
                req.params
            );
        });
    }
}

/**
 * Interface for outlet configurations that contain a definition object.
 */
export interface OutletDefined<TScope extends Scope<object>>
{
    [outletDefinition]: OutletDefinition<TScope>;
}

export function isOutletDefined<TScope extends Scope<object>>(value: unknown): value is OutletDefined<TScope>
{
    return typeof value === 'object' && value !== null && outletDefinition in value;
}

/**
 * Configuration interface for outlet parts.
 */
export interface OutletDefinition<TScope extends Scope<object>>
{
    /**
     * Template name or promise resolving to the template content
     */
    template?: string | Promise<string>;

    /**
     * Controller function to initialize the part
     */
    controller?(
        element: HTMLElement | ShadowRoot,
        params: unknown
    ): { [Symbol.dispose]?(): void; templateReloaded?(): void };
}

/**
 * Builder class for creating outlet definitions with command handling.
 */
export class OutletDefinitionBuilder<TScope extends Scope<object>> implements OutletDefinition<TScope>
{
    constructor(private readonly commandActions?: EventBus<Record<string, Event<[unknown]>>>)
    {
    }

    template?: string | Promise<string>;
    controller?(element: HTMLElement | ShadowRoot, params: unknown): { [Symbol.dispose]?(): void };
    private controllerCommands: EventBus<Record<string, Event<[unknown]>>>

    /**
     * Sets the template for the outlet definition.
     * @param template - Template name or promise
     * @returns This builder instance for method chaining
     */
    useTemplate(template?: string | Promise<string>): this
    {
        this.template = template;
        return this;
    }

    /**
     * Sets the controller function for the outlet.
     * @param controller - Initialization controller
     * @returns This builder instance
     */
    useController(
        controller: (
            element: HTMLElement | ShadowRoot,
            params: unknown
        ) => Disposable
    )
    {
        if (this.controllerCommands)
            throw new Error('Cannot use both controller and commandResult');
        this.controller = controller;
    }

    /**
     * Registers a command result handler for the outlet.
     * @param commandName - Name of the command to listen for
     * @param handler - Handler function to execute when command result is received
     * @param options - Event listener options
     * @returns This builder instance
     */
    useCommandResult(
        commandName: string,
        handler: (result: unknown) => void | Promise<void>,
        options?: EventOptions<Event<[]>>
    )
    {
        if (!this.controllerCommands && this.controller)
            throw new Error('Cannot use both controller and commandResult');

        if (!this.controller)
        {
            this.useController(() =>
            {
                this.controllerCommands = new EventBusWrapper(this.commandActions);
                return this.controllerCommands;
            })
        }

        this.controllerCommands.on(commandName, handler, options);
        return this;
    }
}
