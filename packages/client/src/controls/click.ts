import { control, Control } from './control.js'
import { Promisify, Binding, isPromiseLike } from '@akala/core'
import { IScope } from '../scope.js';
import { Event } from './event.js';

@control('click')
export class Click extends Event
{
    constructor()
    {
        super('click');

    }
}
