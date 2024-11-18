import { platform } from 'os';
import { join } from 'path';
import { type ServeOptions } from './cli/serve.js';
import { registerCommands } from './generator.js'
import { ICommandProcessor } from './model/processor.js';
import { ErrorWithStatus } from '@akala/core';
import { Container } from './model/container.js';
import { ConnectionPreference } from './serve-metadata.browser.js';
import { handlers } from './protocol-handler.js';

export type ServeMetadata = Record<string, object>

export async function connectByPreference<T = unknown>(options: ServeMetadata, settings: ConnectionPreference, ...protocolOrder: string[]): Promise<{ container: Container<T>, processor: ICommandProcessor }>
{
    if (!protocolOrder || !protocolOrder.length)
        protocolOrder = ['jsonrpc+unix+tls', 'jsonrpc+unix', 'jsonrpc+unix+tls', 'jsonrpc+tcp+tls', 'jsonrpc+tcp', 'wss', 'ws', 'https', 'http'];

    const optionsEntries = Object.entries(options);
    const orderedOptions = protocolOrder.map(order =>
    {
        let entry: (typeof optionsEntries)[number]
        if (entry = optionsEntries.find(e => e[0].startsWith(order)))
            return entry;
    });
    const container = new Container<T>(settings?.metadata?.name || 'proxy', undefined);
    let processor: ICommandProcessor;
    let preferredIndex: number = -1;
    do
    {
        preferredIndex = orderedOptions.findIndex((option, i) => i > preferredIndex && option);
        if (preferredIndex === -1)
            throw new ErrorWithStatus(404, 'no matching connection preference was found');

        try
        {
            if (protocolOrder.length == 0)
                throw new ErrorWithStatus(404, 'No valid connection option could be found')
            processor = await connectWith(orderedOptions[preferredIndex][0], orderedOptions[preferredIndex][1], settings?.signal)
            break;
        }
        catch (e)
        {
            console.warn(e);
        }
    }
    // eslint-disable-next-line no-constant-condition
    while (true);

    if (settings?.metadata)
        registerCommands(settings.metadata.commands, processor, container);
    else
    {
        var metaContainer = await container.dispatch('$metadata');
        registerCommands(metaContainer.commands, processor, container);
    }

    return { container, processor };

}

export async function connectWith<T>(connectionString: string, options: object, signal: AbortSignal, container?: Container<T>): Promise<ICommandProcessor>
{
    const { processor, getMetadata } = await handlers.process(new URL(connectionString), { signal, ...options }, {})

    if (container)
    {
        const meta = await getMetadata();
        registerCommands(meta.commands, null, container);
    }

    return processor;

}

export default function serveMetadata(context: ServeOptions): ServeMetadata
{
    let args = context.args;
    if (!args || args.length == 0)
        args = ['local'];

    const result: Record<string, object> = {};

    let options: object;
    if (context.options.key)
        options = { key: context.options.key, cert: context.options.cert };
    else
        options = {};

    let socketPath: string;
    if (args.indexOf('local') > -1)
    {
        if (platform() == 'win32')
            if (context.options.key)
                socketPath = 'jsonrpc+unix+tls://\\\\?\\pipe\\' + context.options.socketName.replace(/\//g, '\\');
            else
                socketPath = 'jsonrpc+unix://\\\\?\\pipe\\' + context.options.socketName.replace(/\//g, '\\');
        else
            if (context.options.key)
                socketPath = 'jsonrpc+unix+tls://' + join(process.cwd(), context.options.socketName.replace(/\//g, '-').replace(/^@/g, '') + '.sock');
            else
                socketPath = 'jsonrpc+unix://' + join(process.cwd(), context.options.socketName.replace(/\//g, '-').replace(/^@/g, '') + '.sock');

        result[socketPath] = options
        // metadata.socket = [{ path: socketPath }];
    }


    if (args.indexOf('tcp') > -1)
    {
        if (isNaN(Number(context.options.tcpPort)) && context.options.tcpPort)
        {
            const indexOfColon = context.options.tcpPort.lastIndexOf(':');
            if (indexOfColon > -1)
            {
                const host = context.options.tcpPort.substring(0, indexOfColon);
                const port = Number(context.options.tcpPort.substring(indexOfColon + 1))
                if (context.options.key)
                    socketPath = 'jsonrpc+tcp+tls://' + host + ':' + port;
                else
                    socketPath = 'jsonrpc+tcp://' + host + ':' + port;
            }
            else
                if (context.options.key)
                    socketPath = 'jsonrpc+unix+tls://' + context.options.tcpPort
                else
                    socketPath = 'jsonrpc+unix://' + context.options.tcpPort
        }
        else
            if (context.options.key)
                socketPath = 'jsonrpc+tcp+tls://0.0.0.0:' + context.options.tcpPort
            else
                socketPath = 'jsonrpc+tcp://0.0.0.0:' + context.options.tcpPort

        result[socketPath] = options
    }

    if (args.indexOf('http') > -1 || args.indexOf('ws') > -1)
    {
        let port: number;
        if (context.options.port)
            port = context.options.port;
        else
        {
            if (context.options.cert && context.options.key)
                port = 443
            else
                port = 80;
        }
        if (context.options.cert && context.options.key)
        {
            if (~args.indexOf('ws'))
                result['wss://0.0.0.0:' + port] = options
            if (~args.indexOf('http'))
                result['https://0.0.0.0:' + port] = options
        }
        else
        {
            if (~args.indexOf('ws'))
                result['ws://0.0.0.0:' + port] = options
            if (~args.indexOf('http'))
                result['http://0.0.0.0:' + port] = options
        }

    }
    return result;
}

serveMetadata.$inject = ['$container', 'options'];