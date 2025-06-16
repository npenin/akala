import { State, ToolDefinition } from "../../state.js";

export default function (this: State): { tools: ToolDefinition[] }
{
    return { tools: this.capabilities.tools.map(tool => ({ ...tool, command: undefined })) };
}
