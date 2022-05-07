import { Container, Metadata, updateCommands } from "@akala/commands";

export default async function (remoteContainer: Container<void>)
{
    const metadata: Metadata.Container = await remoteContainer.dispatch('$metadata');
    remoteContainer.name = metadata.name;
    updateCommands(metadata.commands, null, remoteContainer);
}