import * as akala from "..";
import { Container } from "../container";

export default async function start<TState = any>(name: string, folder?: string, state?: TState)
{
    folder = folder || process.cwd();

    if (typeof state == 'string')
        try
        {
            state = JSON.parse(state);
        }
        catch (e)
        {
            console.warn('state is not a json parsable string');
        }

    var container = new Container(name, state);
    await akala.Processors.FileSystem.discoverCommands(folder, container);
    return container;
};