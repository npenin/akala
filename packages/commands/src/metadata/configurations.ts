import { OptionOptions, OptionType } from '@akala/cli';
import { FileSystemConfiguration, HttpConfiguration, SchemaConfiguration } from '../processors/index.js'
import { Resolvable } from '@akala/core';

export type jsonPrimitive = string | number | boolean | undefined;
export type jsonObject = { [key: string]: jsonPrimitive | jsonPrimitive[] | jsonObject[] | jsonObject };

export type ExtendedConfigurations<TConfiguration extends Configuration, TKey extends string> = Omit<Configurations, TKey> & { [name in TKey]: TConfiguration }

export type GenericConfiguration = Configuration & jsonObject;

export interface Configuration
{
    inject?: Resolvable[];
    auth?: Configuration & { required?: boolean };
}

export interface ConfigurationWithAuth<T extends Configuration & { required?: boolean }> extends Configuration
{
    auth?: T
}


export interface ConfigurationMap //extends Record<string, Configuration>
{
    http: HttpConfiguration;
    '': Configuration;
    fs: FileSystemConfiguration;
    cli: CliConfiguration;
    doc: DocConfiguration;
    schema: SchemaConfiguration
    jsonrpc: Configuration
}

export interface Configurations extends Partial<ConfigurationMap>
{
    bindings?: BindingConfiguration
}


export interface CliConfiguration extends Configuration
{
    usage?: string;
    options?: { [key: string]: OptionOptions<OptionType> };
}

export interface DocConfiguration extends Configuration, SimpleDocConfiguration
{
    translations?: Record<string, SimpleDocConfiguration>
}

interface SimpleDocConfiguration
{
    description?: string;
    options?: { [key: string]: string };
}

export interface BindingConfiguration extends Record<string, {
    source: Resolvable,
    where: Resolvable
}>
{
}
