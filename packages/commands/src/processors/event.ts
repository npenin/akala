import { Processor, CommandProcessors } from "../model/processor";
import { CommandProxy } from "../model/command";
import { EventEmitter } from "events";

export class EventProcessor<T> extends EventEmitter implements Processor<T>
{
    public async process(command: CommandProxy<any>, param: { param: any[], [key: string]: any }): Promise<any>
    public async process(command: string, param: { param: any[], [key: string]: any }): Promise<any>
    public async process(command: CommandProxy<any> | string, param: { param: any[], [key: string]: any }): Promise<any>
    {
        this.emit('processing', command, param);
        if (this.processor.requiresCommandName)
            if (typeof command === 'string')
                var result = await this.processor.process(command, param)
            else
                var result = await this.processor.process(command.name, param)
        else if (typeof command !== 'string')
            var result = await (this.processor as Processor<T>).process(command, param)
        else
            throw new Error('Command was required but only command name was provided');
        this.emit('processed', command, param, result);
        return result;
    }

    public on(event: 'processing', handler: (cmd: CommandProxy<any> | string, param: { param: any[], [key: string]: any }) => void)
    public on(event: 'processed', handler: (cmd: CommandProxy<any> | string, param: { param: any[], [key: string]: any }, result: any) => void)
    public on(event: string, handler: (...args: any[]) => void)
    {
        super.on(event, handler);
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