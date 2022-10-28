import commands from "./container";
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SidecarMap } from '@akala/pm'
import { State } from "./state";
import { Container as BaseContainer, Processors, registerCommands } from "@akala/commands";
import path from 'path';
export { State };

declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/pubsub': commands.container;
    }
}

export type Container = commands.container;
export type ContainerProxy = commands.proxy;

//eslint-disable-next-line @typescript-eslint/no-var-requires
const metaContainer = require('../commands.json');

export default class PubSubContainer extends BaseContainer<State> implements commands.container
{
    constructor(name: string = 'pubsub')
    {
        super(name, {});
        registerCommands(metaContainer.commands, new Processors.FileSystem(__dirname), this);
    }
}