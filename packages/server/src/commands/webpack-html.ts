import { State } from '../state'
import { extend } from '@akala/core'

export default function htmlConfig(this: State, options?: unknown): unknown
{
    return extend(this.webpack.html, options);
}