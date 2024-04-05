import { FileSystemConfiguration, HttpConfiguration, SchemaConfiguration } from '../processors/index.js'
import { CliConfiguration, Configuration, DocConfiguration, jsonObject } from './command.js'

export interface Configurations
{
    [key: string]: undefined | jsonObject & Configuration;
    http?: jsonObject & HttpConfiguration;
    ''?: jsonObject & Configuration;
    fs?: jsonObject & FileSystemConfiguration;
    cli?: jsonObject & CliConfiguration;
    doc?: jsonObject & DocConfiguration;
    schema?: jsonObject & SchemaConfiguration
    auth?: jsonObject & { [key in keyof Configurations]?: Configuration }
}
