import { OptionOptions } from "@akala/cli";
import { Configurations } from "./configurations.js";

export type jsonPrimitive = string | number | boolean | undefined;
export type jsonObject = { [key: string]: jsonPrimitive | jsonPrimitive[] | jsonObject[] | jsonObject };

export interface Command
{
    name: string;
    config: Configurations;
}

export type ExtendedConfigurations<TConfiguration extends GenericConfiguration, TKey extends string> = Configurations & { [name in TKey]: TConfiguration }

export type GenericConfiguration = Configuration & jsonObject;

export interface Configuration
{
    inject?: string[];
}

export function isCommand(x: unknown): x is Command
{
    return typeof (x) == 'object' && x && 'name' in x && 'config' in x && typeof (x['config']) == 'object';
}

export function extractCommandMetadata<T extends Command>(x: T): Command
{
    return { name: x.name, config: x.config };
}


export interface CliConfiguration extends Configuration
{
    usage?: string;
    options?: { [key: string]: OptionOptions };
}

export interface DocConfiguration extends Configuration
{
    description?: string;
    options?: { [key: string]: string };
}
