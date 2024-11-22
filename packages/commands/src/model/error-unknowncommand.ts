import { Container } from "./container.js";

export class UnknownCommandError extends Error
{
    public readonly code = 'INVALID_CMD';

    constructor(public readonly commandName: string, public readonly container: Container<unknown>)
    {
        super(`Command with name ${commandName} could not be found in ${container.name}`)
    }
}