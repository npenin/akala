import { wcObserve } from '@akala/client';
import { Popover } from './popover.js';
import { flip, Middleware, offset } from '@floating-ui/dom';


export const parentSize: () => Middleware = () =>
{
    return {
        name: 'parentSize',
        fn(state)
        {
            if (state.strategy == 'absolute')
            {
                switch (state.placement)
                {
                    case 'top':
                    case 'bottom':
                    case 'top-start':
                    case 'top-end':
                    case 'bottom-start':
                    case 'bottom-end':
                        return { data: { minWidth: state.elements.reference.getBoundingClientRect().width } }
                    default:
                        break;
                }
            }
        },
    }
}

@wcObserve('aria-controls')
export class Dropdown extends Popover
{
    constructor(element: HTMLInputElement)
    {
        super(element);
        this.middlewares = [parentSize(), flip({ crossAxis: false }), offset({ mainAxis: 4 })];
    }
}
