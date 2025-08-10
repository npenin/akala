import type { State, ToolDefinition } from "../../state.js";

export default function (this: State): { tools: ToolDefinition[] }
{
    console.error(this.capabilities.tools)
    return { tools: this.capabilities.tools.map(tool => ({ ...tool, command: undefined })) };
}
