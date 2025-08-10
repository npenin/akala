import commands from "./container.js";
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SidecarMap } from '@akala/pm'
import { type State } from "./state.js";
export { type State };
import { Metadata } from "@akala/commands";

declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/pubsub': commands.container;
    }
}
export { type SidecarMap };
export type Container = commands.container;
export type ContainerProxy = commands.proxy;
export const connect = commands.connect;

export const meta = commands.meta as Metadata.Container;
