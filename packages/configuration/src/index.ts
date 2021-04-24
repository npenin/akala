import { Configuration } from './configuration'

export default Configuration;
export { Configuration };

import Commander from './commander'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _pm from '@akala/pm';
import { Container } from '@akala/commands';
declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/configuration': Commander.container & Container<void>;
    }
}