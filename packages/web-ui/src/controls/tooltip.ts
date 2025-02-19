import { Composer, HtmlControlElement, subscribe, TeardownManager, wcObserve } from '@akala/client';
import { Popover } from './popover.js';
import { arrow, flip, offset, shift } from '@floating-ui/dom';




export class TooltipComposer implements Composer<void>
{
    constructor()
    {
    }

    readonly selector = '[tooltip]';

    optionGetter(options: object): void
    {
    }

    apply(item: HTMLElement): Disposable//: Promise<IControlInstance<unknown>[]>
    {
        let preventClose = false;

        const tooltip = item.getAttribute('tooltip');

        function getPopover()
        {
            for (let container = item; container.parentElement; container = container.parentElement)
            {
                let result = (container.querySelector(tooltip) as HtmlControlElement<Popover>);
                if (result)
                    return result;
            }

        }

        const subscriptions = subscribe(item, {
            mouseenter: (ev) =>
            {
                const popover = getPopover();

                popover.classList.add('tooltip');

                if (!popover.checkVisibility())
                    popover.control.showPopover(item, [offset({ mainAxis: 8 }), arrow({ element: popover.control.arrow })]);

                popover.addEventListener('mouseenter', (ev) =>
                {
                    preventClose = true;
                })
                popover.addEventListener('mouseleave', (ev) =>
                {
                    preventClose = false;
                })
            },
            mouseleave: () =>
            {
                if (preventClose)
                    return;

                const popover = getPopover();
                popover.control.hidePopover();
            }
        });

        return new TeardownManager(Object.values(subscriptions));
    }

}

@wcObserve('aria-controls')
export class Tooltip extends Popover
{
    constructor(element: HTMLInputElement)
    {
        super(element);
        this.middlewares = [flip({ crossAxis: false }), shift()]
    }
}