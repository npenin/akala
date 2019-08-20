import { Processor, CommandNameProcessor, CommandProcessor, CommandProcessors } from "../processor";
import { CommandProxy } from "../command";
import { EventEmitter } from "events";
import { Container } from "../container";

export class EventProcessor<T> extends EventEmitter implements Processor<T>
{
    public async process(command: CommandProxy<any>, ...param: any[]): Promise<any>
    public async process(command: string, ...param: any[]): Promise<any>
    public async process(command: CommandProxy<any> | string, ...param: any[]): Promise<any>
    {
        this.emit('processing', command, param);
        if (this.processor.requiresCommandName)
            if (typeof command === 'string')
                var result = await this.processor.process(command, ...param)
            else
                var result = await this.processor.process(command.name, ...param)
        else if (typeof command !== 'string')
            var result = await this.processor.process(command, ...param)
        else
            throw new Error('Command was required but only command name was provided');
        this.emit('processed', command, param);
        return result;
    }

    public name = 'event';

    public get requiresCommandName()
    {
        return this.processor.requiresCommandName;
    }


    constructor(private processor: CommandProcessors<T>)
    {
        super();
    }
}