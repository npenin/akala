import { a, DataBind, e, OutletService, Page, page, RootElement, t } from '@akala/client'
import template from './index.html?raw'
import { type PageEventArg, type SortEventArg, type TableConfig } from '@akala/web-ui';
import { Binding } from '@akala/core';

// type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;
type Person = { id: number, age: number, name: string, email: string }

const data: Person[] = [
    {
        "id": 1,
        "name": "Alice",
        "age": 25,
        "email": "alice@example.com"
    },
    {
        "id": 2,
        "name": "Bob",
        "age": 30,
        "email": "bob@example.com"
    },
    {
        "id": 3,
        "name": "Charlie",
        "age": 35,
        "email": "charlie@example.com"
    },
    {
        "id": 4,
        "name": "David",
        "age": 40,
        "email": "david@example.com"
    },
    {
        "id": 5,
        "name": "Eve",
        "age": 22,
        "email": "eve@example.com"
    },
    {
        "id": 6,
        "name": "Frank",
        "age": 28,
        "email": "frank@example.com"
    },
    {
        "id": 7,
        "name": "Grace",
        "age": 33,
        "email": "grace@example.com"
    },
    {
        "id": 8,
        "name": "Hank",
        "age": 45,
        "email": "hank@example.com"
    },
    {
        "id": 9,
        "name": "Ivy",
        "age": 27,
        "email": "ivy@example.com"
    },
    {
        "id": 10,
        "name": "Jack",
        "age": 31,
        "email": "jack@example.com"
    },
    {
        "id": 11,
        "name": "Karen",
        "age": 29,
        "email": "karen@example.com"
    },
    {
        "id": 12,
        "name": "Leo",
        "age": 37,
        "email": "leo@example.com"
    },
    {
        "id": 13,
        "name": "Mona",
        "age": 26,
        "email": "mona@example.com"
    },
    {
        "id": 14,
        "name": "Nathan",
        "age": 34,
        "email": "nathan@example.com"
    },
    {
        "id": 15,
        "name": "Olivia",
        "age": 34,
        "email": "olivia@example.com"
    },
    {
        "id": 16,
        "name": "Paul",
        "age": 34,
        "email": "paul@example.com"
    },
    {
        "id": 17,
        "name": "Quincy",
        "age": 41,
        "email": "quincy@example.com"
    },
    {
        "id": 18,
        "name": "Rachel",
        "age": 24,
        "email": "rachel@example.com"
    },
    {
        "id": 19,
        "name": "Steve",
        "age": 38,
        "email": "steve@example.com"
    },
    {
        "id": 20,
        "name": "Tina",
        "age": 36,
        "email": "tina@example.com"
    }
];

@page({ template, 'inject': [RootElement] })
export class DesignKit extends Page
{
    constructor(el: HTMLElement)
    {
        super(el);
    }

    static options = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => crypto.randomUUID());

    typeahead(search: string)
    {
        return DesignKit.options.filter(o => !search || o.includes(search));
    }

    async fakeServer(sort: SortEventArg<Person>[], paging: PageEventArg)
    {
        let result = await Promise.resolve(data.slice(0));

        if (sort?.length)
        {
            result.sort((a, b) =>
                sort.reduce((previous, current) =>
                {
                    if (previous)
                        return previous;

                    if (current.direction == 'none')
                        return 0;

                    switch (current.columnIndex)
                    {
                        case 0:
                            if (current.direction == 'asc')
                                return a.name.localeCompare(b.name);
                            else
                                return b.name.localeCompare(a.name);
                        case 1:
                            if (current.direction == 'asc')
                                return a.age - b.age;
                            else
                                return b.age - a.age;
                    }
                    return 0;
                }, 0)
            )
        }

        if (paging)
        {
            result = result.slice(paging.startOffset, paging.pageSize + paging.startOffset);
        }

        return result;
    }

    table1: { config: TableConfig<Person>, data: Person[] } = {
        config: {
            pageSize: 7,
            sortAscClasses: ['fa-solid', 'fa-sort-asc'],
            sortDescClasses: ['fa-solid', 'fa-sort-desc'],
            columns: [
                { title: 'Name', sort: 'name', render: { content(item) { return Binding.combineNamed({ name: item.pipe('name'), email: item.pipe('email') }).pipe(ev => t(`${ev.value.name} (${ev.value.email})`)) } } },
                { title: 'Age', data: 'age' }
            ]
        },
        data
    };

    table2: { config: TableConfig<Person>, data: Person[] } = {
        config: {
            columns: [
                { title: 'Name', render: { content(item) { const el = a(e('input'), 'type', 'text'); DataBind.bind(el, { value: item.pipe('name') }); return el; } } },
                { title: 'Age', render: { content(item) { return item.pipe('age').pipe(ev => t(ev.value)); } } }
            ]
        },
        data
    };

    [OutletService.onLoad]()
    {
        this.element.querySelectorAll('.indeterminate input[type="checkbox"]').forEach((checkbox: HTMLInputElement) =>
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
