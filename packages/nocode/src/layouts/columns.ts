import { dom } from "@akala/pages";

export type GridSplit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type GridEvenSplit = 1 | 2 | 3 | 4 | 6 | 12;
export type BreakPoints = 'LaptopS' | 'LaptopM' | 'LaptopL' | 'Tablet' | 'Laptop' | 'LaptopL' | 'kkkk' | 'fullhd';

export class Columns
{
    columns: dom.Div[];

    constructor(columns: GridSplit[], breakpoint: BreakPoints = 'Tablet')
    {
        this.columns = columns.map(c => ({
            type: 'div',
            attributes: { class: { value: breakpoint + '-' + c } }
        }))
    }
}