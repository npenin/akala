import { State } from '../state.js'

export default function htmlConfig(this: State, options?: unknown): unknown
{
    return Object.assign(this.webpack.html, options);
}