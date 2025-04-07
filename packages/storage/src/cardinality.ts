export enum CardinalityValues
{
    None = 0,
    OneToOne = 1,
    OneToMany = 2,
    ManyToOne = 5,
    ManyToMany = 6,

    ToOne = 1,
    ToMany = 2,

    FromMany = 4,
}

export class Cardinality
{
    constructor(public value: CardinalityValues)
    {
    }

    public get isToMany() { return (this.value & CardinalityValues.ToMany) == CardinalityValues.ToMany; }
    public get isToOne() { return !this.isToMany; }

    public get isMany() { return (this.value & CardinalityValues.FromMany) == CardinalityValues.FromMany; }
    public get isOne() { return !this.isMany; }

    public static readonly OneToOne = new Cardinality(CardinalityValues.OneToOne);
    public static readonly ManyToOne = new Cardinality(CardinalityValues.ManyToOne);

    public static readonly OneToMany = new Cardinality(CardinalityValues.OneToMany);
    public static readonly ManyToMany = new Cardinality(CardinalityValues.ManyToMany);
}

/* eslint-disable @typescript-eslint/no-namespace */
export namespace Cardinality
{
    export namespace One
    {
        export const ToOne = new Cardinality(CardinalityValues.OneToOne);
        export const ToMany = new Cardinality(CardinalityValues.OneToMany);
    }
    export namespace Many
    {
        export const ToOne = new Cardinality(CardinalityValues.ManyToOne);
        export const ToMany = new Cardinality(CardinalityValues.ManyToMany);
    }

    export namespace ToOne
    {
        export const One = new Cardinality(CardinalityValues.OneToOne);
        export const Many = new Cardinality(CardinalityValues.ManyToOne);
    }
    export namespace ToMany
    {
        export const One = new Cardinality(CardinalityValues.OneToMany);
        export const Many = new Cardinality(CardinalityValues.ManyToMany);
    }
}
