export * from './controls/popover.js'
export * from './controls/typeahead.js'
export * from './controls/tooltip.js'
export * from './controls/dropdown.js'
export * from './controls/mark.js'
export * from './controls/table.js'

import { type Formatter, formatters } from '@akala/core'
import bootstrap from './default.js'

export { bootstrap };
export default bootstrap;


formatters.register('invoke', class implements Formatter<(ev: Event) => unknown>
{
    constructor(private readonly inner: (value, ev) => unknown) { }

    format(value: unknown): (ev: Event) => unknown
    {
        let lastEv: Event;
        return (ev) =>
        {
            if (ev === lastEv)
                return false;
            lastEv = ev;
            return this.inner(value, ev);
        }
    }

})
