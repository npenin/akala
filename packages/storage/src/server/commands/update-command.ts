import { CommandProcessor } from './command-processor';
import { CommandType } from './command';
import { ModelDefinition } from '../shared';

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
