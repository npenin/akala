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

    public static OneToOne = new Cardinality(CardinalityValues.OneToOne);
    public static ManyToOne = new Cardinality(CardinalityValues.ManyToOne);

    public static OneToMany = new Cardinality(CardinalityValues.OneToMany);
    public static ManyToMany = new Cardinality(CardinalityValues.ManyToMany);
}

/* eslint-disable @typescript-eslint/no-namespace */
export namespace Cardinality
{
    export namespace One
    {
        export var ToOne = new Cardinality(CardinalityValues.OneToOne);
        export var ToMany = new Cardinality(CardinalityValues.OneToMany);
    }
    export namespace Many
    {
        export var ToOne = new Cardinality(CardinalityValues.ManyToOne);
        export var ToMany = new Cardinality(CardinalityValues.ManyToMany);
    }

    export namespace ToOne
    {
        export var One = new Cardinality(CardinalityValues.OneToOne);
        export var Many = new Cardinality(CardinalityValues.ManyToOne);
    }
    export namespace ToMany
    {
        export var One = new Cardinality(CardinalityValues.OneToMany);
        export var Many = new Cardinality(CardinalityValues.ManyToMany);
    }
}