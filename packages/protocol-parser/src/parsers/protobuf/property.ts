import CoreProperty from "../property.js";
import { AnyParser } from "../_common.js";
import { WireType } from './field.js';

export type ArrayItem<T> = T extends ((infer X)[]) ? X : T;

export default class Property<T, TKey extends keyof T> extends CoreProperty<T, TKey>
{
    public wireType: WireType;

    constructor(name: TKey, wireType: WireType, parser?: AnyParser<T[TKey], Partial<T>>)
    {
        super(name, parser);
        this.wireType = wireType;
    }
}