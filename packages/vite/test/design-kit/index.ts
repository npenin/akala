import { Scope as IScope, ScopeImpl, Page, page, LocationService } from '@akala/client'
import { Container, Processors } from '@akala/commands';
import { EventEmitter, Event } from '@akala/core';
import template from './index.html?raw'

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

@page({ template, 'inject': [ScopeImpl.injectionToken, '$modules.akala-services.$location'] })
export class DesignKit extends Page
{
    constructor(scope: Scope, location: LocationService)
    {
        super();
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