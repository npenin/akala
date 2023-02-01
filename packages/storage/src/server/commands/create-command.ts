import { CommandProcessor } from './command-processor.js';
import { CommandType } from './command.js';
import { ModelDefinition } from '../shared.js';

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
