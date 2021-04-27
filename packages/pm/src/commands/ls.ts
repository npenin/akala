import State from '../state.js';

export default function ls(this: State): State['config']['mapping']
{
    return this.config.mapping;
}