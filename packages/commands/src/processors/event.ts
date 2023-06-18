import { StructuredParameters, ICommandProcessor, CommandMetadataProcessorSignature } from '../model/processor.js';
// import { CommandProxy } from '../model/command';
import { MiddlewarePromise, EventEmitter } from "@akala/core";
import { Command } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { addHandler } from '../protocol-handler.js';

addHandler('event', async (_url, inner) => ({ processor: new EventProcessor(inner.processor), getMetadata: inner.getMetadata }));

export class EventProcessor extends EventEmitter<{
    processing: CommandMetadataProcessorSignature<unknown>,
    'processing-failed': [...CommandMetadataProcessorSignature<unknown>, Error],
    processed: [...CommandMetadataProcessorSignature<unknown>, unknown],
}> implements ICommandProcessor
{
    public name = 'event';

    //eslint-disable-next-line @typescript-eslint/prefer-as-const
    public readonly requiresCommandName: false = false;


    constructor(public readonly processor: ICommandProcessor)
    {
        super();
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