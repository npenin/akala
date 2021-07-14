import commander from './commander';
import { Configuration } from './configuration'

export default Configuration;
export { Configuration };

export type container = commander.container;
export type containerHelper = commander.proxy;

import { } from '@akala/pm';
import { CommandNameProcessor } from '@akala/commands';
declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/config': commander.container;
    }
}