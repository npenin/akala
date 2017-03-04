/// <reference types="jquery" />
/// <reference types="node" />
/// <reference types="express" />
import { Router } from './router';
import { EventEmitter } from 'events';
import { Template } from './template';
import { IScope } from './scope';
import * as express from 'express';
export declare type PartInstance = {
    scope: any;
    element: JQuery;
};
export declare class Part extends EventEmitter {
    private template;
    private router;
    constructor(template: Template, router: Router);
    private parts;
    register(partName: string, control: PartInstance): void;
    apply(partInstance: () => PartInstance, part: PartDefinition, params: any, next: express.NextFunction): void;
    use(url: string, partName: string, part: PartDefinition): void;
}
export interface PartDefinition {
    template?: string;
    controller?<TScope extends IScope>(scope: TScope, element: JQuery, params: any, next: () => void): void;
}
