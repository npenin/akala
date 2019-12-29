import { Container } from "@akala/commands";
import State, { RunningContainer } from "../state";
import { fork } from "child_process";

export default async function stop(this: State, name: string, container: Container<State>)
{
    await Promise.all(this.processes.filter(p => name == 'pm' || !name || p.name == name && p.process).map(cp =>
    {
        return new Promise((resolve, reject) =>
        {
            if (cp.process && cp.running)
            {
                var timeout = setTimeout(function ()
                {
                    cp.process.kill();
                }, 5000)
                cp.process.on('exit', (code, signal) =>
                {
                    container.unregister(cp.name);
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
            process.exit()
    });
};

exports.default.$inject = ['param.0', 'container']
