import { SchemaObject } from 'ajv';
import { Command } from './command.js';

export interface Container
{
    name: string;
    stateless?: boolean;
    extends?: string[];
    dependencies?: string[];
    commands: Command[];
    $defs?: Record<string, SchemaObject>
}