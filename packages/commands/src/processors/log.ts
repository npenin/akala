import { Processor } from "../model/processor";
import { CommandProxy } from "../model/command";
import { EventProcessor } from "./event";

export class LogProcessor<T> extends EventProcessor<T>
{
    public name = 'log';

    constructor(processor: Processor<T>,
        preExecute?: typeof processor.process,
        postExecute?: typeof processor.process)
    {
        super(processor);
        if (preExecute)
            this.on('processing', preExecute);
        if (postExecute)
            this.on('processed', postExecute);
    }
}