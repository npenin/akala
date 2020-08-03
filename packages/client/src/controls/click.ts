import { control, Control } from './control'
import { Promisify, Binding, isPromiseLike } from '@akala/core'
import { IScope } from '../scope';
import { Event } from './event';

@control('click')
export class Click extends Event
{
    constructor()
    {
        super('click');

    }
}
