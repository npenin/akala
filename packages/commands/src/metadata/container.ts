import { Command } from "./command";

export interface Container
{
    name: string;
    commands: Command[];
}