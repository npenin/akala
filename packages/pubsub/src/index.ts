import commands from "./container";
import { SidecarMap } from '@akala/pm'
import { State } from "./state";
import { Container, Processors, proxy, registerCommands } from "@akala/commands";
import path from 'path';
export { State };

declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/pubsub': commands.container;
    }
}

export type container = commands.container;

import metaContainer from '../commands.json'

export default class PubSubContainer extends Container<State> implements commands.container
{
    constructor(name: string = 'pubsub')
    {
        super(name, {});
        registerCommands(metaContainer.commands, new Processors.FileSystem(this, path.join(__dirname, '/commands')), this);
    }
}