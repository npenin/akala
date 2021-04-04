import State from "../state";

export default function ls(this: State): State['config']['mapping']
{
    return this.config.mapping;
}