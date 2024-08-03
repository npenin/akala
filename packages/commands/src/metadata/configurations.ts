import { FileSystemConfiguration, HttpConfiguration, SchemaConfiguration } from '../processors/index.js'

export type jsonPrimitive = string | number | boolean | undefined;
export type jsonObject = { [key: string]: jsonPrimitive | jsonPrimitive[] | jsonObject[] | jsonObject };

export type ExtendedConfigurations<TConfiguration extends Configuration, TKey extends string> = Omit<Configurations, TKey> & { [name in TKey]: TConfiguration }

export type GenericConfiguration = Configuration & jsonObject;

export interface Configuration
{
    inject?: string[];
}

export interface ConfigurationWithAuth<T extends Configuration>
{
    inject?: string[];
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
    auth: { required?: boolean } & { [key in Exclude<keyof ConfigurationMap, 'auth'>]?: ConfigurationMap[key] extends ConfigurationWithAuth<infer X> ? X : ConfigurationMap[key] }
}

export interface Configurations extends Partial<ConfigurationMap>
{
}


export interface CliConfiguration extends Configuration
{
    usage?: string;
    options?: { [key: string]: import('@akala/cli').OptionOptions };
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
