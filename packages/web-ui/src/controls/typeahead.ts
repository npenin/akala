import { Control, HtmlControlElement, wcObserve, HotKeyTrigger, Each, ClientBindings, DataContext, Bound, fromEvent } from '@akala/client';
import { Popover } from './popover.js';
import { fromObject } from '@akala/commands';
import { Binding, EmptyBinding, ErrorWithStatus, HttpStatusCode, ObservableArray, Subscription } from '@akala/core';

@wcObserve('options')
@wcObserve('aria-controls')
@wcObserve('multiple')
@wcObserve('renderToText')
export class Typeahead<T> extends Control<{ 'aria-controls': string, multiple: boolean, options?: ((needle: string) => T[]), renderToText?: ((item: T) => string), 'option-template'?: string }, HTMLInputElement>
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
        },
        'Enter': () =>
        {
            const popover = this.popover;
            const currentItem = popover.querySelector<HTMLElement>('[role="option"][aria-activedescendant="true"]');
            if (this.multiple?.getValue())
                this.selectedValues.push(DataContext.get<Bound<{ active: boolean, item: T }>>(currentItem).getValue());
            else
            {
                if (!this.selectedValues.length)
                    this.selectedValues.push(DataContext.get<Bound<{ active: boolean, item: T }>>(currentItem).getValue());
                else
                    this.selectedValues.replace(0, DataContext.get<Bound<{ active: boolean, item: T }>>(currentItem).getValue());

                popover.control.hidePopover();
            }
        }
    }, 'typeahead');

    public readonly selectedValues = new ObservableArray<Bound<{ item: T, active: boolean }>>([]);

    private multiple?: Binding<boolean>;
    renderToText(item: T): string
    {
        if (this.bind('renderToText')?.getValue())
            return this.bind('renderToText')?.getValue()(item);
        if (typeof item == 'string')
            return item;
        if (typeof item == 'object')
        {
            if ('label' in item)
                return item.label?.toString();
            if ('text' in item)
                return item.text?.toString();
            if ('name' in item)
                return item.name?.toString();
        }
    }

    constructor(element: HTMLInputElement)
    {
        super(element);
        this.element.ariaAutoComplete = 'list';
        this.element.setAttribute('autocomplete', 'off');

        let preventClick = false;

        element.addEventListener('focus', (ev) =>
        {
            preventClick = true;
            const popover = this.popover;
            if (!popover.checkVisibility())
            {
                popover.control.showPopover(element);

                const mousemove = fromEvent(popover, 'mousemove');
                const toggle = fromEvent<'toggle', ToggleEvent>(popover, 'toggle');

                const mousemoveSub = this.teardown(this.teardown(mousemove).addListener((ev) =>
                {
                    const currentItem = popover.querySelector('[role="option"][aria-activedescendant="true"]');
                    if (currentItem)
                        currentItem.setAttribute('aria-activedescendant', 'false');

                    (ev.target as HTMLElement).closest('[role="option"]')?.setAttribute('aria-activedescendant', 'true');
                }));


                function onToggle()
                {
                    let toggleSub = toggle.addListener((ev) =>
                    {
                        if (ev.newState == 'closed')
                        {
                            toggleSub();
                            const currentItem = popover.querySelector('[role="option"][aria-activedescendant="true"]');
                            if (currentItem)
                                currentItem.setAttribute('aria-activedescendant', 'false');

                            mousemoveSub();
                            mousemove[Symbol.dispose]();
                        }

                    });
                }

                onToggle();


                element.addEventListener('click', (ev) =>
                {
                    if (preventClick)
                        return;
                    if (document.activeElement == this.element)
                    {
                        if (!popover.checkVisibility())
                        //     popover.control.hidePopover();
                        // else
                        {
                            popover.control.showPopover(element);

                            onToggle();
                        }
                    }

                    ev.preventDefault();
                });
            }
        });

        element.addEventListener("mousedown", function ()
        {
            preventClick = false; // Reset on actual user click
        });


    }

    public get popover()
    {
        return document.getElementById(this.attribute('aria-controls')) as HtmlControlElement<Popover>;
    }

    connectedCallback(): void
    {
        super.connectedCallback();
        HotKeyTrigger.register(this.hotKeys, { element: this.element })

        const textInput = ClientBindings.input(this.element);

        const options = new EmptyBinding<T[]>();

        this.teardown(this.bind('options').onChanged(({ value: search }) =>
        {
            this.teardown(textInput.onChanged((ev) =>
            {
                if (search)
                    options.setValue(search(ev.value));
            }, true))
        }, true))

        this.selectedValues.addListener(ev =>
        {
            switch (ev.action)
            {
                case 'replace':
                    ev.replacedItems.forEach(item =>
                    {
                        item.oldItem.active.setValue(false);
                        item.newItem.active.setValue(true);
                    })
                    break;
                case 'push':
                    ev.newItems.forEach(item => item.active.setValue(true))
                    break;
            }
        })

        this.multiple = this.bind('multiple');
        let selectInputSub: Subscription;
        if (this.multiple)
            this.multiple.onChanged(ev =>
            {
                selectInputSub?.();
                if (!ev.value)
                {
                    selectInputSub = this.teardown(this.selectedValues.addListener(ev =>
                    {
                        switch (ev.action)
                        {
                            case 'push':
                                this.element.value = this.renderToText(ev.newItems[0].item.getValue());
                                break;
                            case 'replace':
                                this.element.value = this.renderToText(ev.replacedItems[0].newItem.item.getValue());
                                break;
                            case 'pop':
                            case 'shift':
                            case 'unshift':
                                throw new ErrorWithStatus(HttpStatusCode.MethodNotAllowed);
                        }
                    }))
                }
            });
        else
        {
            selectInputSub = this.teardown(this.selectedValues.addListener(ev =>
            {
                switch (ev.action)
                {
                    case 'push':
                        this.element.value = this.renderToText(ev.newItems[0].item.getValue());
                        break;
                    case 'replace':
                        this.element.value = this.renderToText(ev.replacedItems[0].newItem.item.getValue());
                        break;
                    default:
                        throw new ErrorWithStatus(HttpStatusCode.MethodNotAllowed);
                }
            }))
        }


        const popover = this.popover;
        if (!popover)
            console.warn('No popover found. Please check the aria-controls attribute on ', this.element);

        const template = Control.nearest(this.element, this.attribute('option-template'));
        if (template)
        {
            if (!(template instanceof HTMLTemplateElement))
                throw new Error('Typeahead: when option-template is provided, it has to reference a <template> element');

            if (Array.from(template.content.childNodes).filter(c => c instanceof HTMLElement).length > 1)
                throw new Error('Typeahead control can only reference a popover with a single child element');

            Each.applyTemplate({
                each: options,
                container: popover,
                root: null,
                indexPropertyName: Each.defaultIndexPropertyName,
                itemPropertyName: Each.defaultItemPropertyName,
                optionsExtend: (option: Bound<{ [Each.defaultIndexPropertyName]: number, [Each.defaultItemPropertyName]: T, needle: string, active: boolean }>) =>
                {
                    if (!option.needle)
                        option.needle = textInput;
                    if (!option.active)
                        option.active = new EmptyBinding(!!this.selectedValues.array.find(sv => sv.item === option[this.attribute(Each.itemPropertyNameAttribute) || Each.defaultItemPropertyName]));
                    else
                        option.active.setValue(!!this.selectedValues.array.find(sv => sv.item === option[this.attribute(Each.itemPropertyNameAttribute) || Each.defaultItemPropertyName]))
                },
                teardownManager: this,
                template: template.content
            })

        }
        else
        {
            if (popover.childElementCount > 1)
            {
                const template = popover.querySelector<HTMLTemplateElement>('>template');
                if (!template)
                    throw new Error('When no option-template is provided, the popover has to contain a single child element or a direct <template> element');

                if (Array.from(template.content.childNodes).filter(c => c instanceof HTMLElement).length > 1)
                    throw new Error('Typeahead control can only reference a popover with a single child element');

                template.remove();


                Each.applyTemplate({
                    each: options,
                    container: popover,
                    root: null,
                    indexPropertyName: Each.defaultIndexPropertyName,
                    itemPropertyName: Each.defaultItemPropertyName,
                    optionsExtend: (option: Bound<{ [Each.defaultIndexPropertyName]: number, [Each.defaultItemPropertyName]: T, needle: string, active: boolean }>) =>
                    {
                        if (!option.needle)
                            option.needle = textInput;
                        if (!option.active)
                            option.active = new EmptyBinding(!!this.selectedValues.array.find(sv => sv.item === option[this.attribute(Each.itemPropertyNameAttribute) || Each.defaultItemPropertyName]));
                        else
                            option.active.setValue(!!this.selectedValues.array.find(sv => sv.item === option[this.attribute(Each.itemPropertyNameAttribute) || Each.defaultItemPropertyName]))
                    },
                    teardownManager: this,
                    template: template.content
                })
            }
            else
            {
                if (popover.firstElementChild instanceof HTMLTemplateElement)
                {
                    const template = popover.firstElementChild;
                    template.remove();

                    Each.applyTemplate({
                        each: options,
                        container: popover,
                        root: null,
                        indexPropertyName: Each.defaultIndexPropertyName,
                        itemPropertyName: Each.defaultItemPropertyName,
                        optionsExtend: (option: Bound<{ [Each.defaultIndexPropertyName]: number, [Each.defaultItemPropertyName]: T, needle: string, active: boolean }>) =>
                        {
                            if (!option.needle)
                                option.needle = textInput;
                            if (!option.active)
                                option.active = new EmptyBinding(!!this.selectedValues.array.find(sv => sv.item === option[this.attribute(Each.itemPropertyNameAttribute) || Each.defaultItemPropertyName]));
                            else
                                option.active.setValue(!!this.selectedValues.array.find(sv => sv.item === option[this.attribute(Each.itemPropertyNameAttribute) || Each.defaultItemPropertyName]))
                        },
                        teardownManager: this,
                        template: template.content
                    })


                }
                else
                {
                    const template = popover.firstElementChild;
                    template.remove();

                    Each.applyTemplate({
                        each: options,
                        container: popover,
                        root: null,
                        indexPropertyName: Each.defaultIndexPropertyName,
                        itemPropertyName: Each.defaultItemPropertyName,
                        optionsExtend: (option: Bound<{ [Each.defaultIndexPropertyName]: number, [Each.defaultItemPropertyName]: T, needle: string, active: boolean }>) =>
                        {
                            if (!option.needle)
                                option.needle = textInput;
                            if (!option.active)
                                option.active = new EmptyBinding(!!this.selectedValues.array.find(sv => sv.item === option[this.attribute(Each.itemPropertyNameAttribute) || Each.defaultItemPropertyName]));
                            else
                                option.active.setValue(!!this.selectedValues.array.find(sv => sv.item === option[this.attribute(Each.itemPropertyNameAttribute) || Each.defaultItemPropertyName]))
                        },
                        teardownManager: this,
                        template: template
                    })
                }
            }
        }
    }
}
