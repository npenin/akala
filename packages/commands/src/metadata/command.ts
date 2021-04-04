import { detailed } from "yargs-parser";
import { HttpConfiguration } from "../processors/http-client";

type Argument2<T> = T extends ((a: any, x: infer X, ...z: any[]) => any) ? X : never;


type Options = Argument2<typeof detailed>

export type jsonPrimitive = string | number | boolean | undefined;
export type jsonObject = { [key: string]: jsonPrimitive | jsonPrimitive[] | jsonObject[] | jsonObject };

export interface Command
{
    name: string;
    config: Configurations;
    inject?: string[];
}



export interface Configurations
{
    [key: string]: undefined | jsonObject & Configuration;
    http?: jsonObject & HttpConfiguration;
    cli?: jsonObject & CliConfiguration;
    ''?: jsonObject & Configuration;
}

export type ExtendedConfigurations<TConfiguration extends GenericConfiguration, TKey extends string> = Configurations & { [name in TKey]: TConfiguration }

export type GenericConfiguration = Configuration & jsonObject;

export interface CliConfiguration extends Configuration
{
    options?: Options;
}

export interface Configuration
{
    inject?: string[];
}

