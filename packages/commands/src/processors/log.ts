import { ICommandProcessor } from '../model/processor.js';
import { EventProcessor } from './event.js';

export class LogProcessor extends EventProcessor
{
    public name = 'log';

    constructor(processor: ICommandProcessor,
        preExecute?: (...args: Parameters<typeof processor.handle>) => void,
        postExecute?: (...args: Parameters<typeof processor.handle>) => void)
    {
        super(processor);
        if (preExecute)
            this.on('processing', preExecute);
        if (postExecute)
            this.on('processed', postExecute);
    }
}