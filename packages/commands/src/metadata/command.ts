import { Configurations } from "./configurations.js";


export interface Command
{
    name: string;
    config: Configurations;
}

export function isCommand(x: unknown): x is Command
{
    return typeof (x) == 'object' && x && 'name' in x && 'config' in x && typeof (x['config']) == 'object';
}

export function extractCommandMetadata<T extends Command>(x: T): Command
{
    return { name: x.name, config: x.config };
}


