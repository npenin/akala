import { State } from '../state'
import { extend } from '@akala/core'
import { Configuration } from 'webpack';

export default function alias(this: State, name: string, path: string): Promise<Configuration['resolve']['alias']>
{
    this.webpack.config.resolve = this.webpack.config.resolve || {};
    this.webpack.config.resolve.alias = this.webpack.config.resolve.alias || {};

    return Promise.resolve(extend(this.webpack.config.resolve.alias, { [name]: path }));
}