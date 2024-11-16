import { Metadata, metadataPluginHandler, tsPluginHandler, FileGenerator, protocolHandlers, HandlerResult, ICommandProcessor } from '@akala/commands'
import { Policy } from '../iam.js';
import { Processors } from '@akala/commands';

export default async function $initAkala()
{
    metadataPluginHandler.use(async (options, meta: Metadata.Container & Partial<{ aws: {} }>, outputFolder) =>
    {
        meta.aws = {
            permissions: mergeAll(meta.commands)
        }
    })

    tsPluginHandler.use(11, async (_options, meta, output) =>
    {
        if (meta['aws'])
            await FileGenerator.write(output, `export const awsPermissions = ${JSON.stringify(meta['aws'].permissions)}`);
    })

    protocolHandlers.useProtocol('aws:', (url, _options, result) =>
    {
        if (!url.hostname)
            throw new Error('The url is espected of the form aws://<service>');

        result.getMetadata = () => import(`../../services/${url.hostname}.json`);
        result.processor = new Processors.HttpClient();
        return Promise.resolve(result as HandlerResult<ICommandProcessor>);
    })
}


type Permissions = Policy & { use?: string[] };
const mergedPermissions: Record<string, Permissions> = {};

function mergeAll(commands: Metadata.Command[])
{
    commands.forEach(command =>
    {
        if (command.config.aws?.permissions)
            mergedPermissions[command.name] = merge(command.config.aws.permissions, commands);
    })
    return mergedPermissions;
}

function merge(permissions: Permissions, commands: Metadata.Command[]): any
{
    if (permissions.use)
    {
        permissions.use.forEach(use =>
        {
            let otherPermissions: Permissions;
            if (use in mergedPermissions)
                otherPermissions = mergedPermissions[use];
            else
            {
                otherPermissions = merge(commands.find(c => c.name == use).config.aws.permissions, commands);
            }
            Object.keys(otherPermissions).forEach(service =>
            {
                if (!permissions[service])
                    permissions[service] = { ...otherPermissions[service] };
                else
                    Object.entries(otherPermissions[service]).forEach(([resource, actions]) =>
                    {
                        if (!permissions[service][resource])
                            permissions[service][resource] = { ...actions };
                        else
                            Object.entries(actions).forEach(([action, value]) =>
                            {
                                permissions[service][resource][action] = value;
                            })
                    })
            })
        });
        // delete permissions.use;
    }
    return permissions;
}