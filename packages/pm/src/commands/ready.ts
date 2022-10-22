import { Container, Metadata, registerCommands, SelfDefinedCommand } from '@akala/commands';
import pm from '../container';
import State, { RunningContainer } from '../state';

export default async function ready(this: State, pm: pm.container & Container<State>, container: RunningContainer, remoteContainer: Container<void>): Promise<void>
{
    if (remoteContainer['process'])
    {
        container = remoteContainer as RunningContainer;
        remoteContainer = null;
    }
    if (remoteContainer)
    {
        remoteContainer.register<Metadata.Command>({ name: '$metadata', config: {}, inject: [] }, true);
        const metadata: Metadata.Container = await remoteContainer.dispatch('$metadata');
        remoteContainer.name = metadata.name;
        this.processes[remoteContainer.name] = container = Object.assign(remoteContainer, { process: null, commandable: true, path: '', container: null, running: true, stateless: false });
        registerCommands(metadata.commands, null, container);

        pm.register(container.name, container, true);
        container.register(new SelfDefinedCommand(() =>
        {
            container.running = false;
            pm.unregister(container.name);
        }, '$disconnect'));
    }
    container?.ready?.resolve();
}