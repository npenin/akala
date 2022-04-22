import { Container, Metadata, registerCommands, SelfDefinedCommand } from '@akala/commands';
import pm from '../container';
import State, { RunningContainer } from '../state';

export default async function ready(this: State, pm: pm.container & Container<State>, container: RunningContainer): Promise<void>
{
    if (!container.name && !container.connect && !container.commandable)
    {
        container.commandable = true;
        const metadata: Metadata.Container = await container.dispatch('$metadata');
        container.name = metadata.name;
        registerCommands(metadata.commands, container.processor, container);
        pm.register(container.name, container, true);
        container.register(new SelfDefinedCommand(() => { pm.unregister(container.name) }, '$disconnect'));
    }
    container?.ready?.resolve();
}