import * as akala from '@akala/core'
import { Router, Request } from './router'
import { EventEmitter } from 'events'
import { Part as PartControl } from './controls/part'
import { Template } from './template'
import { IScope } from './scope'
import { service } from './common'
import { LocationService as Location } from './locationService'

export type PartInstance = { scope: any, element: JQuery };

@service('$part', '$template', '$router', '$location')
export class Part extends EventEmitter
{
    constructor(private template: Template, private router: Router, location: Location)
    {
        super();
        location.on('changing', () =>
        {
            var parts = this.parts;
            parts.keys().forEach(function (partName)
            {
                if (partName == '$injector')
                    return;
                (<PartInstance>parts.resolve(partName)).element.empty();
            })
        })
    }

    private parts = new akala.Injector();

    public register(partName: string, control: PartInstance)
    {
        var parts = this.parts;
        parts.register(partName, control);
        parts.keys().forEach(function (partName)
        {
            if (partName == '$injector')
                return;
            (<PartInstance>parts.resolve(partName)).element.empty();
        })
    }

    public apply<TScope extends IScope<any>>(partInstance: () => PartInstance, part: PartDefinition<TScope>, params: any, next: akala.NextFunction)
    {
        var parts = this.parts;
        var template = this.template;
        if (part.template)
            template.get(part.template).then(function (template)
            {
                var p = partInstance();
                if (!p)
                    return;
                if (part.controller)
                    part.controller(p.scope, p.element, params, next);
                if (template)
                    template(p.scope, p.element.empty());
            });
        else
        {
            var p = partInstance();
            if (!p)
                return;
            if (part.controller)
                part.controller(p.scope, p.element, params, next);
            else
                next();
        }
    }

    public use<TScope extends IScope<any>>(url: string, partName: string = 'body', part: PartDefinition<TScope>)
    {
        var self = this;
        this.router.use(url, function (req: Request, next: akala.NextFunction)
        {
            console.log('apply part for url' + url);

            self.apply(() => self.parts.resolve(partName), part, req.params, next);
        });
    }
}

export interface PartDefinition<TScope extends IScope<any>>
{
    template?: string;
    controller?(scope: TScope, element: JQuery, params: any, next: () => void): void;
}