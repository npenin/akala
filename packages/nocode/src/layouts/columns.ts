import { dom } from "@akala/pages";

export type GridSplit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type GridEvenSplit = 1 | 2 | 3 | 4 | 6 | 12;
export type BreakPoints = 'LaptopS' | 'LaptopM' | 'LaptopL' | 'Tablet' | 'Laptop' | 'kkkk' | 'fullhd';

export class Columns implements dom.Div
{
    constructor(columns: { width: GridSplit, content?: dom.FlowContentTags[] }[], breakpoint: BreakPoints = 'Tablet')
    {
        this.content = columns.map(c => ({
            type: 'div',
            attributes: { class: { value: breakpoint + '-' + c.width } },
            content: c.content
        }))
    }

    content?: dom.FlowContentTags<Record<string, { value: string; }>>[];
    readonly type = "div";
}
