import { CommandProcessor } from './command-processor';
import { CommandType } from './command';
import { ModelDefinition } from '../shared';

export class CreateCommand<T>
{
    constructor(public readonly record: T, public readonly model: ModelDefinition<T>)
    {
    }

    public type: CommandType.Create = CommandType.Create;

    public accept(processor: CommandProcessor<unknown>)
    {
        return processor.visitInsert(this);
    }
}
