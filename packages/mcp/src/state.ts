import { Container, Metadata } from "@akala/commands";
import { Router1Async } from "@akala/core";
import ajv from 'ajv'

export interface State
{
    capabilities: { tools: ToolDefinition[], resources: ResourceDefinition[], resourceTemplates: ResourceTemplateDefinition[] };
    resourceRouter: Router1Async<{ path: string, uri: URL, params?: Record<string, string> }>;
    container: Container<unknown>
}


export interface ToolDefinition
{
    name: string;
    description: string;
    inputSchema: ajv.Schema;
    command: Metadata.Command
}

export interface ResourceDefinition
{
    uri: string,
    name: string,
    description: string,
    mimeType: `${string}/${string}`
}

export interface ResourceTemplateDefinition
{
    uriTemplate: string,
    name: string,
    description: string,
    mimeType: `${string}/${string}`
}

export interface Capability
{
    subscribe?: boolean;
    listChanged?: boolean;
}

export interface ServerCapabilities
{
    protocolVersion: "2024-11-05",
    capabilities: {
        prompts?: Omit<Capability, 'subcribe'>
        resources?: Capability,
        logging?: {},
        tools?: Omit<Capability, 'subcribe'>
    },
    serverInfo: {
        name: "Akala",
        title: "Akala MCP server",
        version: "0.0.0"
    },
}

export interface ClientCapabilities
{
    capabilities: {
        prompts?: Omit<Capability, 'subcribe'>
        resources?: Capability,
        logging?: {},
        tools?: Omit<Capability, 'subcribe'>
    }
}
