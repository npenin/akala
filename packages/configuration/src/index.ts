import { Configuration } from './configuration'

export default Configuration;
export { Configuration };

import Commander from './commander'

import * as pm from '@akala/pm';
declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/configuration': Commander;
    }
}