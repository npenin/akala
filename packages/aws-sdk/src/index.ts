import { Metadata } from "@akala/commands";
import { Policy } from "./iam.js";

export interface AwsConfiguration extends Metadata.Configuration
{
    permissions?: Policy;
}

declare module '@akala/commands'
{
    export interface ConfigurationMap
    {
        aws: AwsConfiguration;
    }
}