import { State } from '../state'
import { extend } from '@akala/core'

export default async function htmlConfig(this: State, options?: any)
{
    return extend(this.webpack.html, options);
}