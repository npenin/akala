import { FileSystemConfiguration, HttpConfiguration } from '../processors'
import { CliConfiguration, Configuration, DocConfiguration, jsonObject } from './command'

export interface Configurations
{
    [key: string]: undefined | jsonObject & Configuration;
    http?: jsonObject & HttpConfiguration;
    ''?: jsonObject & Configuration;
    fs?: jsonObject & FileSystemConfiguration;
    cli?: jsonObject & CliConfiguration;
    doc?: jsonObject & DocConfiguration;
}
