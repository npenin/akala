export type jsonPrimitive = string | number | boolean | undefined;
export type jsonObject = { [key: string]: jsonPrimitive | jsonPrimitive[] | jsonObject[] | jsonObject };

export interface Command
{
    name: string;
    triggers: TriggerConfigurations;
    inject?: string[];
}

export type TriggerConfigurations = { [key: string]: jsonObject & TriggerConfiguration };

export interface TriggerConfiguration
{
    inject?: string[];
}

