import { StructuredParameters, ICommandProcessor, CommandMetadataProcessorSignature } from '../model/processor';
// import { CommandProxy } from '../model/command';
import { EventEmitter } from "events";
import { MiddlewarePromise } from "@akala/core";
import { Command } from '../metadata/index';
import { Container } from '../model/container';

export class EventProcessor extends EventEmitter implements ICommandProcessor
{

    public on(event: 'processing', handler: (...args: CommandMetadataProcessorSignature<any>) => void): this
    public on(event: 'processing-failed', handler: (...args: [...CommandMetadataProcessorSignature<any>, Error]) => void): this
    public on(event: 'processed', handler: (...args: [...CommandMetadataProcessorSignature<any>, unknown]) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public on(event: string, handler: (...args: [...CommandMetadataProcessorSignature<any>, Error]) => void): this
    {
        return super.on(event, handler);
    }

    public name = 'event';

    public readonly requiresCommandName: false = false;


    constructor(public readonly processor: ICommandProcessor)
    {
        super();
    }

    async handle(origin: Container<any>, command: Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
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