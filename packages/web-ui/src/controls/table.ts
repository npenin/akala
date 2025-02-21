import { Bound, c, content, Control, CssClass, DataContext, e, Each, s, subscribe, t } from "@akala/client";
import { Binding, Event, ObservableArray, ObservableObject, Parser, Subscription } from "@akala/core";
import { BinaryExpression, BinaryOperator, ConstantExpression, MemberExpression, TypedExpression } from "@akala/core/expressions";
import tableCss from './table.css?inline'

export type SortDirection = 'asc' | 'desc' | 'none';

export type SortEventArg<T> = { columnIndex: number, direction: SortDirection, field: false | keyof T };
export type SortEventArgs<T> = SortEventArg<T>[];
export type PageEventArg = { pageIndex: number, startOffset: number, pageSize: number };

export type ColumnConfig<T> = {
    title?: string,
    data?: keyof T,
    sort?: keyof T | boolean | ((a: T, b: T) => number);
    render?: {
        filter?(): Node | null,
        content?(item: Binding<T>): Binding<Node> | Node;
        header?: Node | DocumentFragment
    }
    filterType?: string
};

export interface TableConfig<T>
{
    sortAscClasses?: string[]
    sortDescClasses?: string[]
    sort?: (arg: SortEventArgs<T>) => void,
    page?: (arg: PageEventArg) => void,
    columns?: ColumnConfig<T>[]
}

export interface RunningTableConfig<T>
{
    columns?: ColumnConfig<T>[];
    sort: Event<[SortEventArgs<T>]>;
    page: Event<[PageEventArg]>;
}

const localSort = Symbol('local sort subscription');

export class Table<T> extends Control<{ data: T[] | ObservableArray<T>, config: TableConfig<T> }>
{
    private sort: ObservableArray<SortEventArg<T>> = new ObservableArray([]);
    // private page: Binding<PageEventArg> = new EmptyBinding();

    public static compare<T>(a: T, b: T): number
    {
        switch (typeof a)
        {
            case "string":
                switch (typeof b)
                {
                    case "string":
                        return a.localeCompare(b);
                    case "number":
                    case "bigint":
                    case "boolean":
                    case "symbol":
                        return a.localeCompare(b.toString());
                    case "object":
                        if (b === null)
                            return 1;
                        break;
                    case "undefined":
                        return 1;
                    case "function":
                        return 0;

                }
                break;
            case "number":

                switch (typeof b)
                {
                    case "string":
                        return -b.localeCompare(a.toString());
                    case "number":
                        return a - b;
                    case "bigint":
                        if (a > b)
                            return 1;
                        if (a < b)
                            return -1;
                        return 0;
                    case "boolean":
                        if (a)
                            return b ? 0 : 1
                        else
                            return b ? -1 : 0;
                    case "symbol":
                        return 0;
                    case "object":
                        if (b === null)
                            return a ? 1 : 0;
                        return 0;
                    case "undefined":
                        return a ? 1 : 0;
                    case "function":
                        return 0;

                }
            case "bigint":
                switch (typeof b)
                {
                    case "string":
                        return a.toString().padStart(b.length, '0').localeCompare(b);
                    case "number":
                    case "bigint":
                        if (a > b)
                            return 1;
                        if (a < b)
                            return -1;
                        return 0;
                    case "boolean":
                        if (a)
                            return b ? 0 : 1
                        else
                            return b ? -1 : 0;
                    case "symbol":
                        return 0;
                    case "undefined":
                        return a ? 1 : 0;
                    case "object":
                        if (b === null)
                            return a ? 1 : 0;
                        return 0;
                    case "function":
                        return 0;
                }
            case "boolean":
                switch (typeof b)
                {
                    case "string":
                        if (a)
                            return 1;
                        else if (b)
                            return -1;
                        return 0;
                    case "number":
                        return Number(a) - b;
                    case "bigint":
                        return Number(BigInt(a) - b);
                    case "undefined":
                    case "boolean":
                    case "object":
                        if (a)
                            return b ? 0 : 1;
                        else if (b)
                            return -1;
                        return 0;
                    case "symbol":
                    case "function":
                        return 0;

                }
            case "symbol":
                switch (typeof b)
                {
                    case "string":
                        return a.toString().localeCompare(b);
                    case "number":
                    case "bigint":
                    case "boolean":
                        return 0;
                    case "symbol":
                        return a.toString().localeCompare(b.toString());
                    case "undefined":
                        return 1;
                    case "object":
                    case "function":
                        return 0;

                }
            case "undefined":

                switch (typeof b)
                {
                    case "string":
                    case "number":
                    case "bigint":
                    case "boolean":
                    case "symbol":
                        return -1;
                    case "undefined":
                        return 0;
                    case "object":
                        if (b === null)
                            return 0;
                        return -1
                    case "function":
                        return -1;
                }
            case "object":
                if (a === null)
                    return -1;
                return 0;
            case "function":
                return 0;

        }
        return 0;
    }

    public localSort(data: T[] | ObservableArray<T>): ObservableArray<T>
    {
        if (Array.isArray(data))
            data = new ObservableArray(data);

        const columnIndices: Record<number, ColumnConfig<T>> = {};

        if (!(localSort in data))
        {
            data[localSort] = this.sort.addListener(ev =>
            {
                data.replaceArray(data.array.slice(0).sort((a, b) =>
                {
                    return this.sort.array.reduce((previous, current) =>
                    {
                        if (!previous)
                            if (current.direction == 'none')
                                return 0;
                            else if (current.field)
                                switch (current.direction)
                                {
                                    case "asc":
                                        return Table.compare(a[current.field], b[current.field]);
                                    case "desc":
                                        return Table.compare(b[current.field], a[current.field]);
                                }
                            else if (typeof current.columnIndex == "number")
                            {
                                columnIndices[current.columnIndex] = columnIndices[current.columnIndex] || this.bind('config')?.pipe<ObservableArray<ColumnConfig<T>>>('columns').getValue()?.array[current.columnIndex];
                                if (columnIndices[current.columnIndex])
                                {
                                    switch (typeof (columnIndices[current.columnIndex].sort))
                                    {
                                        case "undefined":
                                        case "boolean":
                                        case "object":
                                            return 0;
                                        case "string":
                                        case "number":
                                        case "symbol":

                                            switch (current.direction)
                                            {
                                                case "asc":
                                                    return Table.compare(a[columnIndices[current.columnIndex].sort as keyof T], b[columnIndices[current.columnIndex].sort as keyof T]);
                                                case "desc":
                                                    return Table.compare(b[columnIndices[current.columnIndex].sort as keyof T], a[columnIndices[current.columnIndex].sort as keyof T]);
                                            }
                                        case "function":
                                            switch (current.direction)
                                            {
                                                case "asc":
                                                    return (columnIndices[current.columnIndex].sort as (a: T, b: T) => number)(a, b)
                                                case "desc":
                                                    return (columnIndices[current.columnIndex].sort as (a: T, b: T) => number)(b, a)
                                            }
                                    }
                                }
                            }
                        return 0;
                    }, 0)
                }));
            }, { triggerAtRegistration: true });
        }

        return data;
    }

    public connectedCallback(): void
    {
        super.connectedCallback();
        DataContext.define(this.element, { table: this });

        const shadow = this.element.attachShadow({ mode: 'closed' });
        this.inheritStylesheets(shadow);
        shadow.appendChild(s(e('style'), { innerHTML: tableCss }));

        const table = shadow.appendChild(content.p(document.createElement('table'), document.createElement('thead')));
        const headerRow = table.tHead.appendChild(document.createElement('tr'));

        const dataBody = table.createTBody();

        const columnsBinding = this.bind('config')?.
            pipe<ColumnConfig<T>[] | ObservableArray<ColumnConfig<T>> | NodeListOf<Element>>(new BinaryExpression<TypedExpression<unknown[]>>(new MemberExpression(null, new ConstantExpression('columns'), true), BinaryOperator.Or, new ConstantExpression(Array.from(this.element.querySelectorAll('thead>tr'))))).
            pipe(ev =>
            {
                let result: ObservableArray<ColumnConfig<T>> | Element[];
                if (ev.value && (Array.isArray(ev.value) || ev.value instanceof ObservableArray))
                {
                    result = new ObservableArray(ev.value);
                    result.maxListeners = Number.POSITIVE_INFINITY;
                }
                else
                    result = new ObservableArray(Array.from(ev.value as NodeListOf<Element>).map(el =>
                    {
                        return { render: { header: el } } as ColumnConfig<T>
                    }));

                return result;

            });

        Each.applyTemplate({
            container: headerRow,
            each: columnsBinding,
            root: this.element,
            teardownManager: this,
            optionsExtend: (options: Bound<{ $index: number, column: ColumnConfig<T>, sort: SortEventArg<T> | false }>) =>
            {
                if (!options.sort)
                {
                    let sort: SortEventArg<T> = { columnIndex: options.$index.getValue(), direction: 'none', field: false };
                    options.sort = Binding.combineNamed({
                        content: options.column.pipe<ColumnConfig<T>['render']['content']>('render.content'),
                        data: options.column.pipe<ColumnConfig<T>['data']>('data'),
                        sort: options.column.pipe<ColumnConfig<T>['sort']>('sort'),

                    }).pipe(ev =>
                    {
                        if (ev.value.content && !ev.value.data && !ev.value.sort)
                            return false;
                        return sort;
                    });
                    options.column.pipe('sort').onChanged(ev => ObservableObject.setValue(sort, 'field', typeof ev.value != 'boolean' && typeof ev.value != 'function' && ev.value));
                    options.column.pipe('data').onChanged(ev => ObservableObject.setValue(sort, 'field', ev.value));
                }
            },
            template: (option): Element | Binding<Element> =>
            {
                const th = e('th');

                const sortAsc = c(e('span'), 'sort-asc');
                const sortDesc = c(e('span'), 'sort-desc');
                this.teardown(new CssClass(sortAsc, this.bind('config').pipe('sortAscClasses')))
                this.teardown(new CssClass(sortDesc, this.bind('config').pipe('sortDescClasses')))

                const sortArrowContainer = content(c(e('div'), 'sort-container'), sortAsc, sortDesc);
                new CssClass(sortArrowContainer, {
                    sorted: option.sort.pipe<boolean>('direction!=="none"'),
                    asc: option.sort.pipe<boolean>('direction==="asc"'),
                    desc: option.sort.pipe<boolean>('direction==="desc"')
                })
                let sortSub: Subscription;
                this.teardown(option.sort.onChanged(sortOption =>
                {
                    sortSub?.();
                    CssClass.add(th, { sortable: !!sortOption.value })
                    if (sortOption.value)
                        sortSub = this.teardown(subscribe(th, 'click', ev =>
                        {
                            const sort = new ObservableObject(sortOption.value as SortEventArg<T>);
                            if (ev.ctrlKey)
                            {
                                switch (sort.getValue('direction'))
                                {
                                    case "desc":
                                        sort.setValue('direction', 'none');
                                        break;
                                    case "none":
                                        sort.setValue('direction', 'asc');
                                        break;
                                    case "asc":
                                        sort.setValue('direction', 'desc');
                                        break;
                                }
                                const indexOfSort = this.sort.indexOf(sort.target);
                                if (~indexOfSort)
                                    this.sort.replace(indexOfSort, sort.target);
                                else
                                    this.sort.push(sort.target);
                            }
                            else
                            {
                                for (var other of this.sort.array)
                                    if (other !== sort.target)
                                        ObservableObject.setValue(other, 'direction', 'none');
                                switch (sort.getValue('direction'))
                                {
                                    case "desc":
                                        sort.setValue('direction', 'none');
                                        break;
                                    case "none":
                                        sort.setValue('direction', 'asc');
                                        break;
                                    case "asc":
                                        sort.setValue('direction', 'desc');
                                        break;
                                }
                                this.sort.replaceArray([sort.target]);
                            }
                        }))
                }, true));
                const column = (option.column.getValue() as TableConfig<T>['columns'][0] | HTMLElement);

                if (column instanceof Element)
                    return content(th, column);

                return Binding.combineNamed({
                    header: option.column.pipe<Element>('render?.header'),
                    title: option.column.pipe('title'),
                    data: option.column.pipe('data')
                }).pipe(ev =>
                {
                    if (ev.value.header)
                        return content(th, ev.value.header, sortArrowContainer);
                    if (ev.value.title)
                        return content(th, content(e('span'), t(ev.value.title)), sortArrowContainer);
                    if (ev.value.data)
                        content(th, content(e('span'), t(column.data.toString())), sortArrowContainer) as Element;
                    content(th, t('no template nor valuable property defined'));
                });
            },
            indexPropertyName: Each.defaultIndexPropertyName,
            itemPropertyName: 'column',
        })

        Each.applyTemplate({
            container: dataBody,
            each: this.bind('data', new Error('missing data attribute')),
            root: this.element,
            teardownManager: this,
            template: (itemOption) =>
            {
                const row = e('tr');
                DataContext.defineDirect(row, DataContext.extend(DataContext.find(this.element), { ...itemOption, config: this.bind('config') }));
                Each.applyTemplate({
                    container: row,
                    each: columnsBinding,
                    root: this.element,
                    teardownManager: this,
                    template: function (option)
                    {
                        const column = (option.column.getValue() as TableConfig<T>['columns'][0] | HTMLElement);
                        if (column instanceof HTMLElement)
                            return column;
                        return content(e('td'), column.render?.content?.(itemOption.item) ??
                            (typeof column.data != 'undefined' ?
                                typeof column.data == 'string' ? itemOption.item.pipe(Parser.parameterLess.parse(column.data)).pipe(ev => t(ev.value?.toString()))
                                    : option.column.pipe(new MemberExpression<T, typeof column.data, T[typeof column.data]>(null, new ConstantExpression(column.data), true)) :
                                t('no template defined')));
                        // const columns = columnsBinding.getValue();
                        // return columns?.[index]?.render?.header ?? columns?.[index]?.data ? a(e('template'), 'data-bind', JSON.stringify({ innerText: columns?.[index]?.data })) :
                        //     c(e('span'), t('no template defined'))
                    },
                    indexPropertyName: Each.defaultIndexPropertyName,
                    itemPropertyName: 'column',
                })

                return row;
            },
            indexPropertyName: Each.defaultIndexPropertyName,
            itemPropertyName: Each.defaultItemPropertyName,
        })
    }
}