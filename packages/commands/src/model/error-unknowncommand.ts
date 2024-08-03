export class UnknownCommandError extends Error
{
    public readonly code = 'INVALID_CMD';

    constructor(public readonly commandName: string)
    {
        super(`Command with name ${commandName} could not be found`)
    }
}