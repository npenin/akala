import { type State } from "../../state.js";

export default function (this: State)
{
    return { resources: this.capabilities.resources }
}
