import { OptionOptions } from "@akala/cli";
import { HttpConfiguration } from "../processors/http-client";

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
    ''?: jsonObject & Configuration;
}

export type ExtendedConfigurations<TConfiguration extends GenericConfiguration, TKey extends string> = Configurations & { [name in TKey]: TConfiguration }

export type GenericConfiguration = Configuration & jsonObject;

export interface Configuration
{
    inject?: string[];
}



export interface CliConfiguration extends Configuration
{
    usage?: string;
    options?: { [key: string]: OptionOptions };
}

export interface Configurations
{
    cli?: jsonObject & CliConfiguration;
}
