import { CreateCommand as Create } from './create-command.js';
import { UpdateCommand as Update } from './update-command.js';
import { DeleteCommand as Delete } from './delete-command.js';
export { Create, Update, Delete }

export enum CommandType
{
    Create,
    Update,
    Delete,
    CreateRelationship,
    DeleteRelationship
}

export type Commands<T> = Create<T> | Update<T> | Delete<T>;



export interface CommandResult
{
    recordsAffected: number;
}