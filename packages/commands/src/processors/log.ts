import { CommandMetadataProcessorSignature, ICommandProcessor } from '../model/processor.js';
import { handlers } from '../protocol-handler.js';
import { EventProcessor } from './event.js';

export class LogProcessor extends EventProcessor
{
    public name = 'log';

    constructor(processor: ICommandProcessor,
        preExecute?: (...args: CommandMetadataProcessorSignature<unknown>) => void,
        postExecute?: (...args: [...CommandMetadataProcessorSignature<unknown>, unknown]) => void)
    {
        super(processor);
        if (preExecute)
            this.on('processing', preExecute);
        if (postExecute)
            this.on('processed', postExecute);
    }
}

handlers.useProtocol('log', (_url, inner) =>
{
    return Promise.resolve({ processor: new LogProcessor(inner.processor, (...args) => console.log(args), (...args) => console.log(args)), getMetadata: inner.getMetadata });
})