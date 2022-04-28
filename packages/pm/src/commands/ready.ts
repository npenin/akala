import { Container, Metadata, registerCommands, SelfDefinedCommand } from '@akala/commands';
import pm from '../container';
import State, { RunningContainer } from '../state';

export default async function ready(this: State, pm: pm.container & Container<State>, container: RunningContainer, remoteContainer: Container<void>): Promise<void>
{
    if (!container)
    {
        remoteContainer.register<Metadata.Command>({ name: '$metadata', config: {}, inject: [] }, true);
        const metadata: Metadata.Container = await remoteContainer.dispatch('$metadata');
        remoteContainer.name = metadata.name;
        this.processes[remoteContainer.name] = container = Object.assign(remoteContainer, { process: null, commandable: true, path: '', container: null, stateless: true, running: true });
        registerCommands(metadata.commands, container.processor, container);
        remoteContainer.register(new SelfDefinedCommand(() =>
        {
            container.running = false;
        }));

        pm.register(container.name, container, true);
        container.register(new SelfDefinedCommand(() => { pm.unregister(container.name) }, '$disconnect'));
    }
    container?.ready?.resolve();
}