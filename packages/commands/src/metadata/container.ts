import { Command } from './command.js';

export interface Container
{
    name: string;
    commands: Command[];
}