import type { ClientCapabilities, ServerCapabilities, State } from "../state.js";

export default function (this: State, protocolVersion: string,
    capabilities: ClientCapabilities,
    clientInfo): ServerCapabilities
{
    return {
        protocolVersion: "2024-11-05",
        capabilities: {
            resources: {},
            tools: {}
        },
        serverInfo: {
            name: "Akala",
            title: "Akala MCP server",
            version: "0.0.0"
        },
    }
}
