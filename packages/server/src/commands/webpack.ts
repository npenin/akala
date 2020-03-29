import * as webpack from 'webpack'
import { State } from '../state'
import { extend } from '@akala/core';

export default async function (this: State, options: any)
{
    throw new Error('Not implemented');
    webpack(extend({
        mode: this.mode,
        entry: {
        }
    }, options));
}