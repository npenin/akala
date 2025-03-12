import { Container } from "@akala/commands";
import State from '../state.js';

export default async function stop(this: State, name: string, container: Container<State>): Promise<void>
{
    await Promise.all(Object.values(this.processes).filter(p => p.name == name && p.process).map(cp =>
    {
        return new Promise<void>((resolve) =>
        {
            if (cp.process && cp.running)
            {
                if (cp.commandable && cp.resolve('$stop'))
                {
                    try
                    {
                        resolve(cp.dispatch('$stop'));
                    }
                    catch (e)
                    {
                        console.error(e);
                    }
                }

                cp.process.stop().then(() => resolve());

            }
            else
                resolve()
        })
    })).then(() =>
    {
        if (name == 'pm' || !name)
        {
            process.emit('SIGINT', 'SIGINT');
        }
    });
}
