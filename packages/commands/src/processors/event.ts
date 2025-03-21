import { StructuredParameters, ICommandProcessor, CommandMetadataProcessorSignature } from '../model/processor.js';
// import { CommandProxy } from '../model/command';
import { MiddlewarePromise, EventEmitter, MiddlewareResult, Event } from "@akala/core";
import { Command } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { handlers } from '../protocol-handler.js';

handlers.useProtocol('event', async (_url, options, inner) => ({ processor: new EventProcessor(inner.processor, options.signal), getMetadata: inner.getMetadata }));

export class EventProcessor extends EventEmitter<{
    processing: Event<CommandMetadataProcessorSignature<unknown>, void>,
    'processing-failed': Event<[...CommandMetadataProcessorSignature<unknown>, MiddlewareResult]>,
    processed: Event<[...CommandMetadataProcessorSignature<unknown>, unknown]>,
}> implements ICommandProcessor
{
    public name = 'event';

    //eslint-disable-next-line @typescript-eslint/prefer-as-const
    public readonly requiresCommandName: false = false;


    constructor(public readonly processor: ICommandProcessor, signal?: AbortSignal)
    {
        super();
        signal?.addEventListener('abort', () => this[Symbol.dispose](), { once: true })
    }

    async handle(origin: Container<unknown>, command: Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        this.emit('processing', origin, command, param);
        try
        {
            const err = await this.processor.handle(origin, command, param)
            this.emit('processing-failed', origin, command, param, err);
            return err;
        }
        catch (result)
        {
            this.emit('processed', origin, command, param, result);
            throw result;
        }
    }
}
