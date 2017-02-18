import * as di from 'akala-core'
import { Router } from './router'
import { EventEmitter } from 'events'
import { Part as PartControl } from './controls/part'
import { Template } from './template'
import { IScope } from './scope'
import { service } from './common'

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

    public use(url: string, partName: string = 'body', part: PartDefinition)
    {
        var parts = this.parts;
        var template = this.template;
        this.router.use(url, function (req, res, next)
        {
            if (part.template)
                template.get(part.template).then(function (template)
                {
                    var p = <PartInstance>parts.resolve(partName);
                    if (!p)
                        return;
                    if (part.controller)
                        part.controller(p.scope, p.element, req.params);
                    if (template)
                        di.Promisify(template(p.scope)).then(function (tmpl)
                        {
                            tmpl.appendTo(p.element.empty());
                        });
                });
            else
            {
                debugger;
                var p = <PartInstance>parts.resolve(partName);
                if (!p)
                    return;
                if (part.controller)
                    part.controller(p.scope, p.element, req.params);
                next();
            }
        });
    }
}

export interface PartDefinition
{
    template?: string;
    controller?<TScope extends IScope>(scope: TScope, element: JQuery, params: any): void;
}