import { dom } from "@akala/pages";

export default function (columns: 1): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags]>
export default function (columns: 2): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 3): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 4): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 5): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 6): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 7): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 8): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 9): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 10): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 11): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function (columns: 12): dom.CompositeTag<'div', Record<string, { value: string }>, [dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags, dom.FlowContentTags]>
export default function <T extends number>(columns: T): dom.Div<Record<string, { value: string }>>
{
    return { type: 'div', classes: ['columns-' + columns], content: new Array(columns) };
}