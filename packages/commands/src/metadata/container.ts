import { Command } from './command';

export interface Container
{
    name: string;
    stateless?: boolean;
    commands: Command[];
}