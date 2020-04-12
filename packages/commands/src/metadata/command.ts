import { HttpConfiguration } from "../processors/http-client";
import { Options } from "yargs-parser";

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
    '': jsonObject & Configuration;
};

export interface CliConfiguration extends Configuration
{
    options?: Options;
}

export interface Configuration
{
    inject?: string[];
}

