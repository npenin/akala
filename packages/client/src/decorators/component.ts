import { Module } from "@akala/core";
import { OutletService } from '../outlet.js';


export function Component<T>(module: Module): (ctor: new (part: OutletService) => T) => void
{
    return module.activateNew('akala-services.$outlet');
}