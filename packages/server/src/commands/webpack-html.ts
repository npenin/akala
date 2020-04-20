import { State } from '../state'
import { html } from './webpack'
import { extend } from '@akala/core'

export default async function htmlConfig(this: State, options?: any)
{
    return extend(html, options);
}