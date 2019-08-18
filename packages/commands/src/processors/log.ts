import { Processor } from "../processor";
import { CommandProxy } from "../command";
import { EventProcessor } from "./event";

export class LogProcessor extends EventProcessor
{
    public name = 'log';

    constructor(processor: Processor, preExecute?: (command: CommandProxy<any>, ...param: any[]) => void, postExecute?: (command: CommandProxy<any>, ...param: any[]) => void)
    {
        super(processor);
        if (preExecute)
            this.on('processing', preExecute);
        if (postExecute)
            this.on('processed', postExecute);
    }
}