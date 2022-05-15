import State from '../state';

export default function ls(this: State): State['config']['containers']
{
    return this.config.containers;
}