import State from "../state";

export default function ls(this: State)
{
    return this.config.mapping;
}