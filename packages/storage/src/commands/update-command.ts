import { CommandProcessor } from './command-processor.js';
import { CommandType } from './command.js';
import { ModelDefinition } from '../shared.js';

export class UpdateCommand<T>
{
    constructor(public readonly record: T, public readonly model: ModelDefinition<T>)
    {
    }

    public type: CommandType.Update = CommandType.Update;

    public accept(processor: CommandProcessor<unknown>)
    {
        return processor.visitUpdate(this);
    }
}
