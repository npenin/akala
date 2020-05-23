import { State } from "../state";
import { Binding } from "@akala/core";

export default function (this: State, mode?: 'development' | 'production')
{
    if (typeof mode == 'undefined')
        return this.mode;
    this.mode = mode;
    return this.mode;
}