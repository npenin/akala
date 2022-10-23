import { Container, Metadata, registerCommands, SelfDefinedCommand } from '@akala/commands';
import pm from '../container';
import State, { RunningContainer } from '../state';

export default async function ready(this: State, pm: pm.container & Container<State>, container: RunningContainer, standaloneContainer: Container<void>): Promise<void>
{
    if (standaloneContainer['process'])
    {
        container = standaloneContainer as RunningContainer;
        if (!container.stateless)
            standaloneContainer = null;
    }
    if (standaloneContainer)
    {
        standaloneContainer.register<Metadata.Command>({ name: '$metadata', config: {}, inject: [] }, true);
        const metadata: Metadata.Container = await standaloneContainer.dispatch('$metadata');
        standaloneContainer.name = metadata.name;
        this.processes[standaloneContainer.name] = container = Object.assign(standaloneContainer, { process: container?.process, commandable: true, path: container?.path, container: container?.container, running: true, stateless: container?.stateless || false });
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