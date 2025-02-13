import { Control, HtmlControlElement, wcObserve, HotKeyTrigger } from '@akala/client';
import { Popover } from './popover.js';
import { fromObject } from '@akala/commands';

@wcObserve('options')
@wcObserve('aria-controls')
export class Typeahead extends Control<{ 'aria-controls': string, options: string }>
{
    private hotKeys = fromObject({
        'ArrowUp': () =>
        {
            const popover = this.popover;
            const currentItem = popover.querySelector('[role="option"][aria-activedescendant="true"]');
            if (currentItem == null)
                popover.querySelector('[role="option"]').setAttribute('aria-activedescendant', 'true');
            else
            {
                const options = Array.from(popover.querySelectorAll('[role="option"]'));
                const currentIndex = options.indexOf(currentItem);
                currentItem.setAttribute('aria-activedescendant', 'false');
                if (currentIndex > 0)
                    options[currentIndex - 1].setAttribute('aria-activedescendant', 'true');
            }
        },
        'ArrowDown': () =>
        {
            const popover = this.popover;
            const currentItem = popover.querySelector('[role="option"][aria-activedescendant="true"]');
            if (currentItem == null)
                popover.querySelector('[role="option"]').setAttribute('aria-activedescendant', 'true');
            else
            {
                const options = Array.from(popover.querySelectorAll('[role="option"]'));
                const currentIndex = options.indexOf(currentItem);
                currentItem.setAttribute('aria-activedescendant', 'false');
                if (currentIndex < options.length - 1)
                    options[currentIndex + 1].setAttribute('aria-activedescendant', 'true');
                else
                    currentItem.setAttribute('aria-activedescendant', 'true');
            }
        },
        'Escape': () =>
        {
            this.popover.control.hidePopover();
        }
    }, 'typeahead');

    constructor(element: HTMLInputElement)
    {
        super(element);
        this.element.ariaAutoComplete = 'list';
        this.element.setAttribute('autocomplete', 'off');

        let preventClick = false;

        element.addEventListener('focus', (ev) =>
        {
            preventClick = true;
            const popover = document.getElementById(this.attrib('aria-controls')) as HtmlControlElement<Popover>;
            if (!popover.checkVisibility())
                popover.control.showPopover(element);
            popover.addEventListener('toggle', () =>
            {
                const currentItem = popover.querySelector('[role="option"][aria-activedescendant="true"]');
                if (currentItem)
                    currentItem.setAttribute('aria-activedescendant', 'false');

            }, { once: true });


            element.addEventListener('click', (ev) =>
            {
                if (preventClick)
                    return;
                if (document.activeElement == this.element)
                {
                    if (popover.checkVisibility())
                        popover.control.hidePopover();
                    else
                    {
                        popover.control.showPopover(element);

                        popover.addEventListener('toggle', () =>
                        {
                            const currentItem = popover.querySelector('[role="option"][aria-activedescendant="true"]');
                            if (currentItem)
                                currentItem.setAttribute('aria-activedescendant', 'false');

                        }, { once: true });
                    }
                }

                ev.preventDefault();
            });
        });

        element.addEventListener("mousedown", function ()
        {
            preventClick = false; // Reset on actual user click
        });
    }

    public get popover()
    {
        return document.getElementById(this.attrib('aria-controls')) as HtmlControlElement<Popover>;
    }

    connectedCallback(): void
    {
        HotKeyTrigger.register(this.hotKeys, { element: this.element })
    }
}