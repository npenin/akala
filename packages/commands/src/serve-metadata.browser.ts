import { registerCommands } from './generator.js'
import { ICommandProcessor } from './model/processor.js';
import { ErrorWithStatus } from '@akala/core';
import { Container } from './model/container.js';
import { handlers } from './protocol-handler.js';
import { Metadata } from './index.browser.js';

export type ServeMetadata = Record<string, object>

export interface ConnectionPreference
{
    preferRemote?: boolean;
    host?: string;
    metadata: Metadata.Container;
    container?: Container<unknown>;
    signal?: AbortSignal;
}

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
            processor = await connectWith(orderedOptions[preferredIndex][0], orderedOptions[preferredIndex][1], settings?.signal, settings?.container)
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

export default function serveMetadata(context): ServeMetadata
{
    throw new Error('Not supported in browser');
}