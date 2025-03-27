import commands from "./container.js";
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SidecarMap } from '@akala/pm'
import { State } from "./state.js";
export { State };
import { Metadata } from "@akala/commands";

declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/pubsub': commands.container;
    }
}
export { SidecarMap };
export type Container = commands.container;
export type ContainerProxy = commands.proxy;
export const connect = commands.connect;

export const meta = commands.meta as Metadata.Container;
