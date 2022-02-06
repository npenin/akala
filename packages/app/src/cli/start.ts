import { Container as pm, sidecar } from '@akala/pm'
import configuration, { Configuration } from '@akala/config'
import { connectByPreference, Container } from '@akala/commands'
import { eachAsync } from '@akala/core';
import os from 'os'
import path from 'path'
import { buildCliContextFromProcess, CliContext } from '@akala/cli';

export interface PubSubConfiguration
{
    transport: string;
}

export interface StoreConfiguration
{
    provider: string
}
export type SidecarConfiguration = string | { name: string, program: string };

export default async function (context: CliContext<{}>, config: Configuration, remote?: string)
{
    config.get('pubsub')
    config.get('store')
    var pm: Container<void> & pm;
    context.logger.debug('connecting to pm...');
    var result = await connectByPreference<void>(require(path.join(os.homedir(), './pm.config.json')).mapping.pm.connect, { host: remote, metadata: await import('@akala/pm/commands.json') })
    pm = result.container as any;
    context.logger.info('connection established.');

    context.logger.help('Your application is now ready !');
}