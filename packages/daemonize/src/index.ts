import os from 'os'
import { spawn } from 'child_process'

export interface CoreService
{
    name: string;
    user: string;
    binPath: string;
    args: string[]
}

// type SystemDBoolean = 'yes' | 'no'

export interface SystemDService
{
    type: 'simple' | 'exec' | 'forking' | 'oneshot' | 'dbus' | 'notify' | 'idle';
    exitType: 'main' | 'cgroup';
    remainAfterExit: boolean;
    guessMainPID: boolean;
    pIDFile: string;
    busName: string;
    execStartPre: string;
    execStartPost: string;
    execCondition: string;
    execReload: string;
    execStop: string;
    execStopPost: string;
    restartSec: number;
    timeoutStartSec: number;
    timeoutStopSec: number;
    timeoutAbortSec: number;
    timeoutSec: number;
    timeoutStartFailureMode: number;
    timeoutStopFailureMode: number;
    runtimeMaxSec: number;
    runtimeRandomizedExtraSec: number;
    WatchdogSec: number;
    description: string;
    doc: string;
    after: string;
    wants: string;
    user: string;
    restart: 'no' | 'on-success' | 'on-failure' | 'on-abnormal' | 'on-watchdog' | 'on-abort' | 'always';
    successExitCode: string;
    restartPreventExitStatus: string;
    restartForceExitStatus: string;
    rootDirectoryStartOnly: boolean;
    nonBlocking: boolean;
    notifyAccess: 'none' | 'main' | 'exec' | 'all';
    sockets: string[]
    fileDescriptorStoreMax: number;
    usbFunctionDescriptors: string;
    usbFunctionStrings: string;
    OOMPolicy: 'continue' | 'stop' | 'kill';
    umask: string;
    wantedBy: string;
    RootDirectoryStartOnly: boolean;
}


export interface OpenRCService
{
    /* declares a hard dependency - net always needs to be started before this service does */
    need: string[]
    /* is a soft dependency - if dns, logger or netmount is in this runlevel start it before, but we don't care if it's not in this runlevel. */
    use: string[]
    /* is between need and use - try to start coolservice if it is installed on the system, regardless of whether it is in the runlevel, but we don't care if it starts. */
    want: string[]
    /* declares that we need to be started before another service */
    before: string[]
    /* declares that we need to be started after another service, without creating a dependency (so on calling stop the two are independent) */
    after: string[]
    /* allows multiple implementations to provide one service type, e.g.: provide cron is set in all cron-daemons, so any one of them started satisfies a cron dependency */
    provide: string[]
    /* allows platform-specific overrides, e.g. keyword -lxc makes this service script a noop in lxc containers. Useful for things like keymaps, module loading etc. that are either platform-specific or not available in containers/virtualization/... */
    keyword: string[]

    command: string;
    command_args: string[];
    command_args_background: string[];
    pidfile: string;
    capabilities: string[];
    procname: string;
}

export interface ServiceMap
{
    'linux': { systemd?: Partial<SystemDService>, openrc?: Partial<OpenRCService> } & Partial<CoreService>;
}



export interface Service extends Partial<CoreService>
{
    platformSpecific: { [key in keyof ServiceMap]: Partial<ServiceMap[key]> & Partial<CoreService> };
}

function spawnAsync(...args: Parameters<typeof spawn>)
{
    var cp = spawn(...args);
    return {
        cp, promise: new Promise<void>((resolve, reject) =>
        {
            cp.on('exit', (code) =>
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
}

function flatTree(o: object): [string, unknown][]
{
    const result: [string, unknown][] = [];
    for (var e of Object.entries(o))
    {
        switch (typeof e[1])
        {
            case 'object':
                if (Array.isArray(e[1]))
                    result.push(e);
                else if (e[1] instanceof Date)
                    result.push(e);
                else
                    flatTree(e[1] as Record<string, unknown>).forEach(e2 => result.push([`${e[0]}_${e2[0]}`, e2[1]]));
                break;
            case 'function':
                break;
            case 'bigint':
            case 'boolean':
            case 'number':
            case 'string':
            case 'symbol':
            case 'undefined':
                result.push(e);
                break;
        }
    }
    return result;
}

export default async function install(service: Service)
{
    let promise: Promise<void>;
    const svc = Object.assign({}, service, service.platformSpecific[os.platform()]) as CoreService;
    if (!svc.name)
        throw new Error('service name not specified');
    if (!svc.binPath)
        throw new Error('service binPath not specified');
    switch (os.platform())
    {
        case 'win32':
            {
                const winCP = spawnAsync(require.resolve('../powershell.ps1'), [svc.name, svc.binPath], { shell: true, stdio: ['pipe', 'inherit', 'inherit'] });
                promise = winCP.promise;
                winCP.cp.stdin.write(JSON.stringify(svc));
            }
            break;
        default:
            {
                const hasSystemD = await spawnAsync('systemctl', ['--version'], { stdio: 'ignore', shell: true }).promise.then(() => true, () => false);
                if (hasSystemD)
                {
                    const otherCP = spawnAsync(require.resolve('../systemd.sh'), [service.name, service.binPath], {
                        env: Object.fromEntries(flatTree(svc).map(([k, v]) => ['DAEMON_' + k.replace('platformSpecific_linux_', ''), Array.isArray(v) ? v.join(' ') : v.toString()])),
                        shell: true,
                        stdio: 'inherit'
                    })
                    promise = otherCP.promise;
                }
                else
                {
                    const hasOpenRC = await spawnAsync('rc-service', ['--version'], { stdio: 'ignore', shell: true }).promise.then(() => true, () => false);
                    if (hasOpenRC)
                    {
                        const otherCP = spawnAsync(require.resolve('../openrc.sh'), [service.name, service.binPath], {
                            env: Object.fromEntries(flatTree(svc).map(([k, v]) => ['DAEMON_' + k.replace('platformSpecific_linux_', ''), Array.isArray(v) ? v.join(' ') : v.toString()])),
                            shell: true,
                            stdio: 'inherit'
                        })
                        promise = otherCP.promise;
                    }
                    else
                    {
                        const otherCP = spawnAsync(require.resolve('../initv.sh'), [service.name, service.binPath], {
                            env: Object.fromEntries(flatTree(svc).map(([k, v]) => ['DAEMON_' + k.replace('platformSpecific_linux_', ''), Array.isArray(v) ? v.join(' ') : v.toString()])),
                            shell: true,
                            stdio: 'inherit'
                        })
                        promise = otherCP.promise;
                    }
                }
            }
            break;
    }
    return await promise;
}