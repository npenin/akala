import { type Bound, c, content, Control, CssClass, DataContext, e, Each, s, subscribe, t } from "@akala/client";
import { Binding, each, EmptyBinding, ErrorWithStatus, Event, formatters, HttpStatusCode, isPromiseLike, map, ObservableArray, ObservableObject, Parser, Sort, type SortDirection, type Subscription, type Watcher, WatcherFormatter } from "@akala/core";
import { BinaryExpression, BinaryOperator, ConstantExpression, MemberExpression, type TypedExpression } from "@akala/core/expressions";
import tableCss from './table.css?inline'

export type SortEventArg<T> = { columnIndex: number, direction: SortDirection, field: false | keyof T };
export type SortEventArgs<T> = ObservableArray<SortEventArg<T>>;
export type PageEventArg = { pageIndex: number, startOffset: number, pageSize: number, isFirst: boolean, isLast: boolean };

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
    sortDescClasses?: string[];
    pageSize?: number;
    columns?: ColumnConfig<T>[];
    row?: { [key in keyof HTMLElementEventMap]?: (ev: HTMLElementEventMap[key]) => void | Promise<void> }
}

type RowSubs = { [key in keyof TableConfig<unknown>['row']]: Subscription };

const localSort = Symbol('local sort subscription');
const localPage = Symbol('local page subscription');

export class TablePager extends Control<{ pageSize: number, totalCount: number }>
{
    public connectedCallback(): void
    {
        const table = this.requiresAncestor(Table);
        const pages = new ObservableArray<PageEventArg>([]);
        Binding.combineNamed({ totalCount: this.bind('totalCount'), pageSize: this.bind('pageSize').pipe(ev => Number(ev.value)) }).onChanged(ev =>
        {
            const currentPage = table.page.getValue()
            if (typeof ev.value.totalCount == 'undefined')
            {

            }
            const pageCount = Math.ceil(ev.value.totalCount / ev.value.pageSize);
            if (pageCount < pages.length)
                pages.pop(pages.length - pageCount)
            for (var i = 0; i < pageCount; i++)
            {
                if (i >= pages.length)
                    pages.push({ pageIndex: i, pageSize: ev.value.pageSize, startOffset: i * ev.value.pageSize, isFirst: i == 0, isLast: i == pageCount - 1 })
                else if (ev.value.pageSize != ev.oldValue?.pageSize)
                    pages.replace(i, { pageIndex: i, pageSize: ev.value.pageSize, startOffset: i * ev.value.pageSize, isFirst: i == 0, isLast: i == pageCount - 1 });
            }
            if (pages.array.length)
                table.page.setValue(pages.array.reduceRight((previous, current) => previous || (current.startOffset <= currentPage.startOffset ? current : previous), null));
        }, true)

        const pagerRow = c(e('div'), 'split-button');
        content.p(table.tableElement, content(e('tfoot'), content(e('tr'), content(s(c(e('th')), { colSpan: table.tableElement.tHead.querySelectorAll('th').length }), pagerRow))));

        const first = document.querySelector<HTMLElement>('[slot="first"]');
        if (first)
        {
            this.teardown(subscribe(pagerRow.appendChild(first), 'click', ev =>
            {
                table.page.setValue(pages.array[0]);
            }));
            CssClass.add(first, { disabled: table.page.pipe('isFirst').pipe(ev => ev.value) })
        }

        const prev = document.querySelector<HTMLElement>('[slot="prev"]');
        if (prev)
        {
            this.teardown(subscribe(pagerRow.appendChild(prev), 'click', ev =>
            {
                table.page.setValue(pages.array[table.page.getValue().pageIndex - 1]);
            }));
            CssClass.add(prev, { disabled: table.page.pipe('isFirst').pipe(ev => ev.value) })
        }
        Each.applyTemplate({
            each: new EmptyBinding(pages),
            indexPropertyName: Each.defaultIndexPropertyName,
            itemPropertyName: Each.defaultItemPropertyName,
            teardownManager: this,
            container: pagerRow,
            root: table.tableElement,
            template: (option) =>
            {
                const page = option.item.getValue();
                const pageEl = content(c(e('div'), 'button'), t(page.pageIndex + 1));
                CssClass.add(pageEl, { active: Binding.combine(table.page, option.item).pipe(ev => ev.value[0] == ev.value[1]) });
                subscribe(pageEl, 'click', () => table.page.setValue(option.item.getValue()))
                return pageEl;
            }
        });

        const next = document.querySelector<HTMLElement>('[slot="next"]');
        if (next)
        {
            pages.addListener(ev => pagerRow.appendChild(next));
            this.teardown(subscribe(pagerRow.appendChild(next), 'click', ev =>
            {
                table.page.setValue(pages.array[table.page.getValue().pageIndex + 1]);
            }));
            CssClass.add(next, { disabled: table.page.pipe('isLast').pipe(ev => ev.value) })
        }

        const last = document.querySelector<HTMLElement>('[slot="last"]');
        if (last)
        {
            pages.addListener(ev => pagerRow.appendChild(last));
            this.teardown(subscribe(pagerRow.appendChild(last), 'click', ev =>
            {
                table.page.setValue(pages.array[pages.array.length - 1]);
            }));
            CssClass.add(last, { disabled: table.page.pipe('isLast').pipe(ev => ev.value) })
        }

        if (pages.array.length)
            table.page.setValue(pages.array[0]);
    }
}

export class Table<T> extends Control<{ data: T[] | ObservableArray<T>, config: TableConfig<T> }>
{
    public readonly sort: ObservableArray<SortEventArg<T>> = new ObservableArray([]);
    public readonly page: Binding<PageEventArg> = new EmptyBinding();
    tableElement: HTMLTableElement;

    public localSort(data: T[] | ObservableArray<T>): ObservableArray<T>
    {
        data = new ObservableArray(data);

        const columnIndices: Record<number, ColumnConfig<T>> = {};

        if (!(localSort in data))
        {
            data[localSort] = this.sort.addListener(ev =>
            {
                data.sort((a, b) =>
                {
                    return this.sort.array.reduce((previous, current) =>
                    {
                        if (previous)
                            return previous;
                        if (current.direction == 'none')
                            return 0;
                        else if (current.field)
                            switch (current.direction)
                            {
                                case "asc":
                                    return Sort.compare(a[current.field], b[current.field]);
                                case "desc":
                                    return Sort.compare(b[current.field], a[current.field]);
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
                                                return Sort.compare(a[columnIndices[current.columnIndex].sort as keyof T], b[columnIndices[current.columnIndex].sort as keyof T]);
                                            case "desc":
                                                return Sort.compare(b[columnIndices[current.columnIndex].sort as keyof T], a[columnIndices[current.columnIndex].sort as keyof T]);
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
                });
            }, { triggerAtRegistration: true });
        }

        return data;
    }

    public localPage(data: T[] | ObservableArray<T>)
    {
        data = new ObservableArray(data);

        if (!(localPage in data))
        {
            const pagedData = data[localPage] = new ObservableArray([])

            pagedData.teardown(Event.combineNamed({ data, page: this.page.getOrCreate('change') }).addListener(ev =>
            {
                pagedData.replaceArray(data.array.slice(ev.page[0].value.startOffset, ev.page[0].value.startOffset + ev.page[0].value.pageSize))
            }));
            this.page.setValue(this.page.getValue());
        }

        return data[localPage];
    }

    public connectedCallback(): void
    {
        super.connectedCallback();
        DataContext.define(this.element, { table: this });

        const shadow = this.element.attachShadow({ mode: 'closed' });
        this.inheritStylesheets(shadow);
        shadow.appendChild(s(e('style'), { innerHTML: tableCss }));

        const table = shadow.appendChild(content.p(document.createElement('table'), document.createElement('thead')));
        this.tableElement = table;
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

        this.bind('config').pipe('pageSize').onChanged(ev => this.page.setValue(Object.assign({ pageIndex: 0, startOffset: 0, isFirst: true, isLast: true }, this.page.getValue(), { pageSize: typeof ev.value == 'undefined' || isNaN(Number(ev.value)) ? 10 : Number(ev.value) })), true)

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
                this.teardown(new CssClass(sortArrowContainer, {
                    sorted: option.sort.pipe<boolean>('direction!=="none"'),
                    asc: option.sort.pipe<boolean>('direction==="asc"'),
                    desc: option.sort.pipe<boolean>('direction==="desc"')
                }));
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
                const config = this.bind('config');
                const subs: RowSubs = {};
                let unsubRow = false;
                this.teardown(() =>
                {
                    if (unsubRow)
                        return false;
                    unsubRow = true;
                    each(subs, sub => sub?.());
                })
                this.teardown(config.pipe('row').onChanged(ev =>
                {
                    each(subs, sub => sub?.());
                    if (ev.value)
                        Object.assign(subs, map(ev.value, (handler, key) => subscribe(row, key, handler)));
                }, true));
                DataContext.defineDirect(row, DataContext.extend(DataContext.find(this.element), { ...itemOption, config: config }));
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

export class TableFormatter<T> extends WatcherFormatter<ObservableArray<T>>
{
    private result = new ObservableArray<T>([])
    private sort?: SortEventArg<T>[];
    private page?: PageEventArg;
    private oaResult?: ObservableArray<T>;
    private sub?: Subscription;

    constructor(private table: Table<T>, watcher: Watcher)
    {
        super(watcher);
        if (!(table instanceof Table))
            throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'expected a table for the table formatter settings');

        if (watcher)
        {
            watcher.on(Symbol.dispose, table.sort.addListener(ev => { this.sort = table.sort.array; watcher.emit('change') }));
            watcher.on(Symbol.dispose, table.page.onChanged(ev => { this.page = ev.value; watcher.emit('change') }));
        }
    }


    format(value: (sort: SortEventArg<T>[], page: PageEventArg) => T[] | ObservableArray<T> | Promise<T[]>): ObservableArray<T>
    {
        if (typeof value != 'function')
            throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'expected a function as a value for the table formatter');

        const result = value(this.sort, this.page || this.table.page.getValue());

        if (isPromiseLike(result))
            result.then(v =>
            {
                if (!v?.length)
                    this.result.replaceArray([]);
                if (!Array.isArray(v))
                    throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'expected an array as a result of the provided function');

                this.result.replaceArray(v);
            });
        else if (Array.isArray(result))
            this.result.replaceArray(result);
        else if (result instanceof ObservableArray)
        {
            if (this.oaResult != result)
            {
                this.oaResult = result;
                this.sub?.();
                this.sub = result.addListener(ev => this.result.replaceArray(result.array), { triggerAtRegistration: true });
            }
        }
        else
            throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'expected an array as a result of the provided function');


        return this.result;
    }

}

formatters.register('table', TableFormatter);
