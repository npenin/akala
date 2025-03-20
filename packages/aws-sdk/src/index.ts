import { Metadata } from "@akala/commands";
import { Policy } from "./iam.js";

export interface AwsConfiguration extends Metadata.Configuration
{
    permissions?: Policy;
    memory?: number;
    timeout?: number;
    doc: string;
    tags: Record<string, string>;
    vpc?: boolean;
}

declare module '@akala/commands'
{
    export interface ConfigurationMap
    {
        aws: AwsConfiguration;
    }
}
