import { CompositeTag, Div, FlowContentTags } from "../dom.js";

export default function (columns: 1): CompositeTag<'div', [FlowContentTags]>
export default function (columns: 2): CompositeTag<'div', [FlowContentTags, FlowContentTags]>
export default function (columns: 3): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags]>
export default function (columns: 4): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags]>
export default function (columns: 5): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags]>
export default function (columns: 6): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags]>
export default function (columns: 7): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags]>
export default function (columns: 8): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags]>
export default function (columns: 9): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags]>
export default function (columns: 10): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags]>
export default function (columns: 11): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags]>
export default function (columns: 12): CompositeTag<'div', [FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags, FlowContentTags]>
export default function <T extends number>(columns: T): Div
{
    return { type: 'div', classes: ['columns-' + columns], content: new Array(columns) };
}