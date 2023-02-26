import { Module } from "@akala/core";
import { Part } from '../part.js';


export function Component<T>(module: Module): (ctor: new (part: Part) => T) => void
{
    return module.activateNew('akala-services.$part');
}