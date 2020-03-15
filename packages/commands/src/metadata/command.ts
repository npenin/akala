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
    '': jsonObject & Configuration;
};

export interface Configuration
{
    inject?: string[];
}

