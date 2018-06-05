import * as di from '@akala/core'
import { control } from './control'
import { Promisify, Binding, isPromiseLike } from '@akala/core'
import { IScope } from '../scope';
import { Event } from './event';

@control()
export class Click extends Event
{
    constructor()
    {
        super('click')
    }
}
