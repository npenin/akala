import { CommandProcessor } from './command-processor';
import { CommandType } from './command';
import { ModelDefinition } from '../shared';

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
