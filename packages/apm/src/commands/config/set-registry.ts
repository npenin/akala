import { State } from "../../state.js";

export default function (this: State, registry: string, scope?: string)
{
    scope ||= '';

    this.registry[scope] = registry;
}
