import { BaseControl } from './control';
import { Part as PartService } from '../part';
export declare class Part extends BaseControl<string> {
    private partService;
    constructor(partService: PartService);
    link(target: any, element: JQuery, parameter: string): void;
}
