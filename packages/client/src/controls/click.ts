import { control } from './control'
import { Event } from './event';

@control('click')
export class Click extends Event
{
    constructor()
    {
        super('click');

    }
}
