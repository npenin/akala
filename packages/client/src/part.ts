import * as di from 'akala-core'
import { Router, Request } from './router'
import { EventEmitter } from 'events'
import { Part as PartControl } from './controls/part'
import { Template } from './template'
import { IScope } from './scope'
import { service } from './common'
import * as express from 'express'

export type PartInstance = { scope: any, element: JQuery };

@service('$part', '$template', '$router')
export class Part extends EventEmitter
{
    constructor(private template: Template, private router: Router)
    {
        super();
    }

    private parts = new di.Injector();

    public register(partName: string, control: PartInstance)
    {
        this.parts.register(partName, control);
    }

    public apply(partInstance: () => PartInstance, part: PartDefinition, params: any, next: express.NextFunction)
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
            debugger;
            var p = partInstance();
            if (!p)
                return;
            if (part.controller)
                part.controller(p.scope, p.element, params, next);
            else
                next();
        }
    }

    public use(url: string, partName: string = 'body', part: PartDefinition)
    {
        var self = this;
        this.router.use(url, function (req: Request, res, next)
        {
            self.apply(() => self.parts.resolve(partName), part, req.params, next);
        });
    }
}

export interface PartDefinition
{
    template?: string;
    controller?<TScope extends IScope>(scope: TScope, element: JQuery, params: any, next: () => void): void;
}