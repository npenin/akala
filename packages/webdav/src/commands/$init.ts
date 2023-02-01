import State from "../state";

export default async function init(this: State, root: string)
{
    this.root = root;
}