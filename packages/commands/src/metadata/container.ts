import { Command } from './command';

export interface Container
{
    name: string;
    stateless?: boolean;
    extends?: string[];
    dependencies?: string[];
    commands: Command[];
}