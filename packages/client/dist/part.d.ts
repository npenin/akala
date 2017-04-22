/// <reference types="jquery" />
/// <reference types="node" />
import * as akala from '@akala/core';
import { Router } from './router';
import { EventEmitter } from 'events';
import { Template } from './template';
import { IScope } from './scope';
import { LocationService as Location } from './locationService';
export declare type PartInstance = {
    scope: any;
    element: JQuery;
};
export declare class Part extends EventEmitter {
    private template;
    private router;
    constructor(template: Template, router: Router, location: Location);
    private parts;
    register(partName: string, control: PartInstance): void;
    apply(partInstance: () => PartInstance, part: PartDefinition, params: any, next: akala.NextFunction): void;
    use(url: string, partName: string, part: PartDefinition): void;
}
export interface PartDefinition {
    template?: string;
    controller?<TScope extends IScope<any>>(scope: TScope, element: JQuery, params: any, next: () => void): void;
}
