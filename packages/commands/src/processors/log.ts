import { CommandMetadataProcessorSignature, CommandProcessor, ICommandProcessor } from '../model/processor.js';
import { handlers } from '../protocol-handler.js';
import { EventProcessor } from './event.js';

export class LogEventProcessor extends EventProcessor
{
    public name = 'log-event';

    constructor(processor: ICommandProcessor,
        signal?: AbortSignal,
        preExecute?: (...args: CommandMetadataProcessorSignature<unknown>) => void,
        postExecute?: (...args: [...CommandMetadataProcessorSignature<unknown>, unknown]) => void)
    {
        super(processor, signal);
        if (preExecute)
            this.on('processing', preExecute);
        if (postExecute)
            this.on('processed', postExecute);
    }
}

export class LogProcessor extends CommandProcessor
{
    constructor(public readonly handle: ICommandProcessor['handle'])
    {
        super('log');
    }
}

handlers.useProtocol('log', (_url, options, inner) =>
{
    return Promise.resolve({ processor: new LogEventProcessor(inner.processor, options?.signal, (...args) => console.log(args), (...args) => console.log(args)), getMetadata: inner.getMetadata });
})