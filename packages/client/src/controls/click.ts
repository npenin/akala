import { control } from './control.js'
import { Event } from './event.js';

@control('click')
export class Click extends Event
{
    constructor()
    {
        super('click');

    }
}
