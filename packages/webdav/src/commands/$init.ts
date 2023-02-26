import State from "../state.js";

export default async function init(this: State, root: string)
{
    this.root = root;
}