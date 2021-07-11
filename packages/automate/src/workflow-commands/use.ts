import { Container, Processors } from "@akala/commands/dist";
import { WorkflowInstanceState } from "../state";

export default async function use(this: WorkflowInstanceState, self: Container<WorkflowInstanceState>, name: string, pathToCommands: string)
{
    var container = new Container(name, this);
    await Processors.FileSystem.discoverCommands(pathToCommands, container, { relativeTo: this.cwd });
    self.register(container);
}