import os from 'os'
import { spawn, ChildProcess } from 'child_process'

export interface CoreService
{
    name: string;
    user: string;
    binPath: string;
}


export interface Service extends Partial<CoreService>
{
    platformSpecific: Record<ReturnType<typeof os.platform>, Partial<CoreService>>
}

export default function install(service: Service)
{

    let cp: ChildProcess;
    const svc = Object.assign({}, service, service.platformSpecific[os.platform()]);
    if (!svc.name)
        throw new Error('service name not specified');
    if (!svc.binPath)
        throw new Error('service binPath not specified');
    switch (os.platform())
    {
        case 'win32':
            cp = spawn(require.resolve('../powershell.ps1'), [svc.name, svc.binPath], { shell: true, stdio: ['pipe', 'inherit', 'inherit'] });
            cp.stdin.write(JSON.stringify(svc));
            break;
        default:
            cp = spawn(require.resolve('../sh.sh'), [service.name, service.binPath], {
                env: Object.fromEntries(Object.entries(svc).map(([k, v]) => ['DAEMON_' + k, v])),
                shell: true,
                stdio: 'inherit'
            })
            break;
    }
    return new Promise<void>((resolve, reject) =>
    {
        cp.on('exit', (code, signal) =>
        {
            if (os.platform() === 'win32')
                if (code !== 0)
                    resolve();
                else
                    reject();
            if (code === 0)
                resolve();
            else
                reject();

        })
    })
}