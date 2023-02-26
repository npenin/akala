import { CommandProcessor } from './command-processor.js';
import { CommandType } from './command.js';
import { ModelDefinition } from '../shared.js';

export class DeleteCommand<T>
{
    constructor(public readonly record: T, public readonly model: ModelDefinition<T>)
    {
    }

    public type: CommandType.Delete = CommandType.Delete;

    public accept(processor: CommandProcessor<unknown>)
    {
        return processor.visitDelete(this);
    }
}
