import State from '../state.js';

export default function ls(this: State): State['config']['containers']
{
    return this.config.containers;
}