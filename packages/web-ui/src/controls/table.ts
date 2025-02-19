import { c, Control, DataContext, e, Each, t } from "@akala/client";
import { Binding, ObservableArray, Parser } from "@akala/core";
import { BinaryExpression, BinaryOperator, ConstantExpression, MemberExpression, TypedExpression } from "@akala/core/expressions";

export interface TableConfig<T>
{
    columns?: {
        title?: string,
        data?: keyof T,
        render?: {
            filter?(): Node | null,
            content?(item: Binding<T>): Binding<Node>
            header?: Node | DocumentFragment
        }
        filterType?: string
    }[]
}

export class Table<T> extends Control<{ data: T[] | ObservableArray<T>, config: TableConfig<T> }>
{
    public connectedCallback(): void
    {
        super.connectedCallback();

        const shadow = this.element.attachShadow({ mode: 'closed' });
        const table = shadow.appendChild(c.p(document.createElement('table'), document.createElement('thead')));
        const headerRow = table.tHead.appendChild(document.createElement('tr'));

        const dataBody = table.createTBody();


        const columnsBinding = this.bind('config')?.pipe<TableConfig<T>['columns']>(new BinaryExpression<TypedExpression<unknown[]>>(new MemberExpression(null, new ConstantExpression('columns'), true), BinaryOperator.Or, new ConstantExpression(Array.from(this.element.querySelectorAll('thead>tr')))), false)

        Each.applyTemplate({
            container: headerRow,
            each: columnsBinding,
            root: this.element,
            teardownManager: this,
            template: function (option): Element | Binding<Element>
            {
                const th = e('th');
                const column = (option.column.getValue() as TableConfig<T>['columns'][0] | HTMLElement);

                if (column instanceof Element)
                    return column;

                return Binding.combineNamed({
                    header: option.column.pipe<Element>('render?.header', true),
                    title: option.column.pipe('title', true),
                    data: option.column.pipe('data', true)
                }).pipe(ev =>
                {
                    if (ev.value.header)
                        return c(th, ev.value.header);
                    if (ev.value.title)
                        return c(th, t(ev.value.title));
                    if (ev.value.data)
                        c(th, t(column.data.toString())) as Element;
                    c(th, t('no template defined'));
                }, true);
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
                        return c(e('td'), column.render?.content?.(itemOption.item) ??
                            (typeof column.data != 'undefined' ?
                                typeof column.data == 'string' ? option.column.pipe(Parser.parameterLess.parse(column.data), true).pipe(ev => t(ev.value?.toString()), true)
                                    : option.column.pipe(new MemberExpression<T, typeof column.data, T[typeof column.data]>(null, new ConstantExpression(column.data), true), true) :
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