import { Configuration, Container, Processors, Trigger } from "@akala/commands";
import { ProcessStdioAdapter } from "./index.js";
import { ErrorWithStatus, HttpStatusCode, Router1Async } from "@akala/core";
import { ResourceDefinition, ResourceTemplateDefinition, State, ToolDefinition } from "./state.js";

export type McpConfiguration = McpResourceConfiguration | McpToolConfiguration

export interface McpToolConfiguration extends Configuration
{
    type: 'tool',
    name?: string;
}

export type McpResourceConfiguration = Configuration &
{
    type: 'resource'
} & (ResourceDefinition | ResourceTemplateDefinition)

declare module '@akala/commands'
{
    export interface ConfigurationMap
    {
        mcp: McpConfiguration;
    }
}

export const McpTrigger = new Trigger('mcp', async (container, signal: AbortSignal) =>
{
    const meta = await container.dispatch('$metadata', true);
    const capabilities: { tools: ToolDefinition[], resources: ResourceDefinition[], resourceTemplates: ResourceTemplateDefinition[] } = { tools: [], resources: [], resourceTemplates: [] }
    const resourceRouter = new Router1Async<{ path: string, uri: URL, params?: Record<string, string> }>();
    meta.commands.forEach(cmd =>
    {
        if (cmd.config.mcp)
        {
            if (!cmd.config.schema)
                throw new ErrorWithStatus(HttpStatusCode.InternalServerError, 'The MCP configuration requires schema to be specified');

            if (cmd.config.mcp.type == 'tool')
                capabilities.tools.push({
                    name: cmd.config.mcp.name || cmd.name,
                    "description": cmd.config.doc?.description,
                    "inputSchema": cmd.config.schema.inject,
                    command: cmd
                });
            if (cmd.config.mcp.type == 'resource')
                if ('uri' in cmd.config.mcp)
                {
                    capabilities.resources.push(cmd.config.mcp);
                    resourceRouter.use(cmd.config.mcp.uri, (request) =>
                    {
                        return container.dispatch(cmd, { _trigger: 'mcp', params: [], path: request.path, uri: request.uri })
                    })
                }
                else
                {
                    capabilities.resourceTemplates.push(cmd.config.mcp);
                    resourceRouter.use(cmd.config.mcp.uriTemplate, (request) =>
                    {
                        return container.dispatch(cmd, { _trigger: 'mcp', params: request.params, path: request.path, uri: request.uri })
                    })
                }
        }
    });

    const mcp = new Container<State>('mcp-server', { capabilities, resourceRouter, container })

    Processors.JsonRpc.trigger.register(mcp, new ProcessStdioAdapter(process, signal));
})
