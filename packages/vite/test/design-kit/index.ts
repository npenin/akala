import { OutletService, Page, page, RootElement } from '@akala/client'
import template from './index.html?raw'

// type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

@page({ template, 'inject': [RootElement] })
export class DesignKit extends Page
{
    constructor(private el: HTMLElement)
    {
        super();

    }

    [OutletService.onLoad]()
    {
        this.el.querySelectorAll('.indeterminate input[type="checkbox"]').forEach((checkbox: HTMLInputElement) =>
        {
            checkbox.indeterminate = true;
        });
    }

    openDialog(dialogId: string)
    {
        return function ()
        {
            (document.getElementById(dialogId) as HTMLDialogElement).showModal();
        }
    }

    closeDialog(dialogId: string)
    {
        return function ()
        {
            (document.getElementById(dialogId) as HTMLDialogElement).close();
        }
    }
}