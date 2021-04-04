import { Container } from "@akala/commands";
import State from "../state";

export default async function stop(this: State, name: string, container: Container<State>): Promise<void>
{
    await Promise.all(this.processes.filter(p => name == 'pm' || !name || p.name == name && p.process).map(cp =>
    {
        return new Promise<unknown>((resolve) =>
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
                const timeout = setTimeout(function ()
                {
                    cp.process.kill();
                }, 5000)
                cp.process.on('exit', (_code, signal) =>
                {
                    container.unregister(cp.name);
                    const indexOfContainer = this.processes.indexOf(cp);
                    if (indexOfContainer > -1)
                        this.processes.splice(indexOfContainer, 1);
                    clearTimeout(timeout);
                    resolve(signal);
                })

                cp.process.kill('SIGINT');
            }
            else
                resolve(null)
        })
    })).then(() =>
    {
        if (name == 'pm' || !name)
        {
            process.emit('SIGINT', 'SIGINT');
            process.exit();
        }
    });
}