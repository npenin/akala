import { ProxyConfiguration } from "@akala/config";

export interface State
{
    loaders: Record<'protocol' | 'format', string[]>;
}