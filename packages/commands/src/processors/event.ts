import { Processor, CommandProcessors, StructuredParameters } from '../model/processor.js';
import { CommandProxy } from '../model/command.js';
import { EventEmitter } from "events";
import { MiddlewarePromise } from "@akala/core";
import { Command } from '../metadata/index.js';

export class EventProcessor extends EventEmitter implements Processor
{

    public on(event: 'processing', handler: (cmd: CommandProxy<unknown> | string, param: StructuredParameters) => void): this
    public on(event: 'processing-failed', handler: (cmd: CommandProxy<unknown> | string, param: Error) => void): this
    public on(event: 'processed', handler: (cmd: CommandProxy<unknown> | string, param: StructuredParameters, result: unknown) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public on(event: string, handler: (cmd: CommandProxy<unknown> | string, param: any, result?: unknown) => void): this
    {
        return super.on(event, handler);
    }

    public name = 'event';

    public get requiresCommandName(): boolean
    {
        return this.processor.requiresCommandName;
    }


    constructor(private processor: CommandProcessors)
    {
        super();
    }
    handle(command: string | Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
    {

        this.emit('processing', command, param);
        let result: MiddlewarePromise;
        if (this.processor.requiresCommandName)
            if (typeof command === 'string')
                result = this.processor.handle(command, param)
            else
                result = this.processor.handle(command.name, param)
        else if (typeof command !== 'string')
            result = (this.processor as Processor).handle(command, param)
        else
            throw new Error('Command was required but only command name was provided');
        result.then(err =>
        {
            this.emit('processing-failed', command, param, err);
            return err;
        }, result =>
        {
            this.emit('processed', command, param, result);
            throw result;
        })
        return result;
    }
}