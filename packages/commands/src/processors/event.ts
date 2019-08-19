import { Processor } from "../processor";
import { CommandProxy } from "../command";
import { EventEmitter } from "events";
import { Container } from "../container";

export class EventProcessor<T> extends EventEmitter implements Processor<T>
{
    public async process(command: CommandProxy<any>, ...param: any[])
    {
        this.emit('processing', command, param);
        var result = await this.processor.process(command, ...param)
        this.emit('processed', command, param);
        return result;
    }

    public name = 'event';


    constructor(private processor: Processor<T>)
    {
        super();
    }
}