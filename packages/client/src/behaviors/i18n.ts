import { Composer } from "../template.js";
import { AttributeComposer } from "./shared.js";
import { DataContext } from "./context.js";
import { ParsedString, Parser, StringCursor, Translator } from "@akala/core";
import { Expressions } from "@akala/core/expressions";

export class I18nParser extends Parser
{
    parseAny(expression: StringCursor, parseFormatter: boolean): Expressions
    {
        if (expression.char == '@')
        {
            expression.offset++;
            if (expression.char == '@')
                return new ParsedString(expression.string);
            else
                expression.offset--;
        }
        return super.parseAny(expression, parseFormatter);
    }
}

export class I18nComposer<T extends Partial<Disposable> & Translator> extends AttributeComposer<T> implements Composer<T>
{
    // apply(item: HTMLElement, options: T, root: Element | ShadowRoot): { [Symbol.dispose](): void; }
    // {
    //     if (item.getAttribute(this.attribute).startsWith('@@'))
    //     {
    //         const elementKey = item.getAttribute(this.attribute).substring(2);
    //         this.applyInternal(item, options, 'innerText', elementKey);

    //         const otherProperties = item.getAttributeNames().filter(att => att.startsWith(this.attribute + '-')).map(att => [att.substring(this.attribute.length + 1), item.getAttribute(att) || elementKey + att.substring(this.attribute.length)] as const);
    //         otherProperties.forEach(p =>
    //         {
    //             this.applyInternal(item, options, p[0], p[1]);
    //         })

    //         return {
    //             [Symbol.dispose]()
    //             {

    //             }
    //         };
    //     }
    //     return super.apply(item, options, root);
    // }
    applyInternal(item: HTMLElement, options: T, subItem: PropertyKey, value: string): void 
    {
        let parent = item;
        let prefix = '';
        while (parent)
        {
            parent = parent.closest('[i18n-prefix]');
            if (parent)
            {
                prefix += parent.getAttribute('i18n-prefix') + '-';
                parent = parent.parentElement;
            }
        }
        if (subItem === AttributeComposer.default)
            subItem = 'innerText';
        // const camelCased = AttributeComposer.toCamelCase(subItem.toString());
        if (Reflect.has(Object.getPrototypeOf(item), subItem))
            item[subItem] = options.translate({ key: prefix + value, fallback: item[subItem == 'innerText' ? 'innerHTML' : subItem] });
        else
            item.setAttribute(subItem.toString(), value ?
                options.translate({ key: prefix, fallback: item.getAttribute(subItem.toString()) }) :
                options.translate({ key: prefix + value, fallback: item.getAttribute(subItem.toString()) }));
    }

    getContext(item: HTMLElement, options?: T)
    {
        return DataContext.extend(DataContext.find(item), { translator: options });
    }

    constructor()
    {
        super('i18n', new I18nParser());
    }
}
