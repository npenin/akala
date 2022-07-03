import { Commands, CommandResult } from './command';

export abstract class CommandProcessor<TOptions = string>
{
    public visitCommands(cmds: Commands<unknown>[])
    {
        var results: PromiseLike<CommandResult>[] = [];
        for (let i = 0; i < cmds.length; i++)
        {
            results.push(this.visit(cmds[i]));
        }
        return Promise.all(results);
    }
    public visit<T>(cmd: Commands<T>)
    {
        return cmd.accept(this);
    }
    abstract visitUpdate<T>(cmd: Commands<T>): PromiseLike<CommandResult>;
    abstract visitDelete<T>(cmd: Commands<T>): PromiseLike<CommandResult>;
    abstract visitInsert<T>(cmd: Commands<T>): PromiseLike<CommandResult>;

    abstract init(options: TOptions): void;

}