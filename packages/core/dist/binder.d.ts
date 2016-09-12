import { EventEmitter } from 'events';
export declare class Binding extends EventEmitter {
    private expression;
    private target;
    static eventNameChangingField: string;
    static eventNameChangedField: string;
    static eventNameBindingError: string;
    constructor(expression: string, target: any);
    getValue(): any;
    private static setValue(target, parts, value, source);
    setValue(value: any, source: any, doNotTriggerEvents: any): void;
}
