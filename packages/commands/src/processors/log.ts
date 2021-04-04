import { Processor } from "../model/processor";
import { EventProcessor } from "./event";

export class LogProcessor extends EventProcessor
{
    public name = 'log';

    constructor(processor: Processor,
        preExecute?: typeof processor.handle,
        postExecute?: typeof processor.handle)
    {
        super(processor);
        if (preExecute)
            this.on('processing', preExecute);
        if (postExecute)
            this.on('processed', postExecute);
    }
}