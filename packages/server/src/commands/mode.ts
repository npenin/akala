import { State } from '../state.js';

export default function (this: State): State['mode']
export default function (this: State, mode?: 'development' | 'production'): void
export default function (this: State, mode?: 'development' | 'production'): void | State['mode']
{
    if (typeof mode == 'undefined')
        return this.mode;
    this.webpack.config.mode = this.mode = mode;
    return this.mode;
}