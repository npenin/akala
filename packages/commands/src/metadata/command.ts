export type jsonPrimitive = string | number | boolean | undefined;
export type jsonObject = { [key: string]: jsonPrimitive | jsonPrimitive[] | jsonObject[] | jsonObject };

export interface Command
{
    name: string;
    config: Configurations;
    inject?: string[];
}

export type Configurations = { [key: string]: jsonObject & Configuration };

export interface Configuration
{
    inject?: string[];
}

