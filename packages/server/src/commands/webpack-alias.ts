import { State } from '../state.js'
import { Configuration } from 'webpack';

export default function alias(this: State, name: string, path: string): Promise<Configuration['resolve']['alias']>
{
    this.webpack.config.resolve = this.webpack.config.resolve || {};
    this.webpack.config.resolve.alias = this.webpack.config.resolve.alias || {};

    return Promise.resolve(Object.assign(this.webpack.config.resolve.alias, { [name]: path }));
}