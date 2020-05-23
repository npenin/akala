import { State } from "../state";

export default function (this: State, mode?: 'development' | 'production')
{
    if (typeof mode == 'undefined')
        return this.mode;
    this.webpack.config.mode = this.mode = mode;
    return this.mode;
}