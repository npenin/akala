import { ClientCapabilities, ServerCapabilities } from "../state.js";

export default function (protocolVersion: string,
    capabilities: ClientCapabilities,
    clientInfo): ServerCapabilities
{
    return {
        capabilities: {
            resources: {},
            tools: {}
        }
    }
}
