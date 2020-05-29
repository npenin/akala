import { State } from '../state'
import { extend } from '@akala/core'

export default async function alias(this: State, name: string, path: string)
{
    this.webpack.config.resolve = this.webpack.config.resolve || {};
    this.webpack.config.resolve.alias = this.webpack.config.resolve.alias || {};

    return extend(this.webpack.config.resolve.alias, { [name]: path });
}