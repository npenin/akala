type RecordValueType<T> = T extends Record<any, infer X> ? X : never;

export interface Document<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> extends Tag<'html', TAttributes>
{
    head?: Partial<{
        title: string, meta: Record<string, { value: string }>, jsInit: Script<TAttributes>[], links: ({
            rel: RecordValueType<TAttributes>;
            src: RecordValueType<TAttributes>;
        } & TAttributes)[], favicon: string,
    }>,
    body: FlowContentTags<TAttributes>[],
}

export interface Tag<T, TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>>
{
    type: T
    classes?: string[]
    attributes?: TAttributes
    event?: { [key: string]: EventListenerOrEventListenerObject };
    render?(n: Node, t: Tag<T, TAttributes>): void
    render?(n: string, t: Tag<T, TAttributes>, prefix: string): string
    renderWithChildren?(n: Node, t: Tag<T, TAttributes>): void
    renderWithChildren?(n: string, t: Tag<T, TAttributes>, prefix: string): string
}

export interface TextTag<T, TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> extends Tag<T, TAttributes>
{
    content: string;
}

export type RawText<TAttributes extends Record<string, { value: string }> = {}> = TextTag<'', TAttributes>

export interface CompositeTag<T, TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>, TTags extends Tag<any>[] = FlowContentTags<TAttributes>[]> extends Tag<T, TAttributes>
{
    content?: TTags;
}

export type Anchor<TAttributes extends Record<string, { value: string }>> = CompositeTag<'a', { href: RecordValueType<TAttributes>; target?: { value: '_blank' } & RecordValueType<TAttributes> } & TAttributes>

export type Paragraph<TAttributes extends Record<string, { value: string }>> = CompositeTag<'p', TAttributes>;
export type Span<TAttributes extends Record<string, { value: string }>> = CompositeTag<'span', TAttributes>;
export type Div<TAttributes extends Record<string, { value: string }>> = CompositeTag<'div', TAttributes>;
export type Audio<TAttributes extends Record<string, { value: string }>> = CompositeTag<'audio', TAttributes>;
export type Video<TAttributes extends Record<string, { value: string }>> = CompositeTag<'video', TAttributes>;
export type Canvas<TAttributes extends Record<string, { value: string }>> = CompositeTag<'canvas', TAttributes>;
export type Frame<TAttributes extends Record<string, { value: string }>> = Tag<'iframe', TAttributes>
export type Iframe<TAttributes extends Record<string, { value: string }>> = Frame<TAttributes>;
export type Address<TAttributes extends Record<string, { value: string }>> = CompositeTag<'address', TAttributes>;
export type Article<TAttributes extends Record<string, { value: string }>> = CompositeTag<'article', TAttributes>;
export type Aside<TAttributes extends Record<string, { value: string }>> = CompositeTag<'aside', TAttributes>;
export type Footer<TAttributes extends Record<string, { value: string }>> = CompositeTag<'Footer', TAttributes>;
export type Header<TAttributes extends Record<string, { value: string }>> = CompositeTag<'header', TAttributes>;
export type Heading<X extends 1 | 2 | 3 | 4 | 5 | 6, TAttributes extends Record<string, { value: string }>> = CompositeTag<`h${X}`, TAttributes>;
export type HeadingGroup<TAttributes extends Record<string, { value: string }>> = CompositeTag<'hgroup', TAttributes>;
export type Main<TAttributes extends Record<string, { value: string }>> = CompositeTag<'main', TAttributes>;
export type Navigation<TAttributes extends Record<string, { value: string }>> = CompositeTag<'nav', TAttributes>;
export type Section<TAttributes extends Record<string, { value: string }>> = CompositeTag<'section', TAttributes>;
export type BlockQuote<TAttributes extends Record<string, { value: string }>> = CompositeTag<'blockquote', TAttributes>;
export type DescriptionDetails<TAttributes extends Record<string, { value: string }>> = CompositeTag<'dd', TAttributes>;
export type DescriptionList<TAttributes extends Record<string, { value: string }>> = CompositeTag<'dl', TAttributes>;
export type DescriptionTerm<TAttributes extends Record<string, { value: string }>> = CompositeTag<'dt', TAttributes>;
export type FigureCaption<TAttributes extends Record<string, { value: string }>> = CompositeTag<'figcaption', TAttributes>;
export type Figure<TAttributes extends Record<string, { value: string }>> = CompositeTag<'figure', TAttributes>;
export type HorizontalRow<TAttributes extends Record<string, { value: string }>> = Tag<'hr', TAttributes>;
export type ListItem<TAttributes extends Record<string, { value: string }>> = CompositeTag<'li', TAttributes>;
export type Menu<TAttributes extends Record<string, { value: string }>> = CompositeTag<'menu', TAttributes>;
export type OrderedList<TAttributes extends Record<string, { value: string }>> = CompositeTag<'ol', TAttributes, ListItem<TAttributes>[]>;
export type PreformatedText<TAttributes extends Record<string, { value: string }>> = Tag<'pre', TAttributes>;
export type UnorderedList<TAttributes extends Record<string, { value: string }>> = CompositeTag<'ul', TAttributes, ListItem<TAttributes>[]>;
export type Abbreviation<TAttributes extends Record<string, { value: string }>> = CompositeTag<'abbr', TAttributes>;
export type Bold<TAttributes extends Record<string, { value: string }>> = CompositeTag<'b', TAttributes>;
export type BidirectionalIsolation<TAttributes extends Record<string, { value: string }>> = CompositeTag<'bdi', TAttributes>;
export type DirectionSwitch<TAttributes extends Record<string, { value: string }>> = CompositeTag<'bdo', TAttributes>;
export type LineBreak<TAttributes extends Record<string, { value: string }>> = Tag<'br', TAttributes>;
export type Cite<TAttributes extends Record<string, { value: string }>> = CompositeTag<'cite', TAttributes>;
export type Code<TAttributes extends Record<string, { value: string }>> = CompositeTag<'code', TAttributes>;
export type Data<TAttributes extends Record<string, { value: string }>> = CompositeTag<'data', TAttributes>;
export type Definition<TAttributes extends Record<string, { value: string }>> = CompositeTag<'dfn', TAttributes>;
export type Emphasis<TAttributes extends Record<string, { value: string }>> = CompositeTag<'em', TAttributes>;
export type Idiomatic<TAttributes extends Record<string, { value: string }>> = CompositeTag<'i', TAttributes>;
export type TextUserInput<TAttributes extends Record<string, { value: string }>> = CompositeTag<'kbd', TAttributes>;
export type Mark<TAttributes extends Record<string, { value: string }>> = CompositeTag<'mark', TAttributes>;
export type ShortQuote<TAttributes extends Record<string, { value: string }>> = CompositeTag<'q', TAttributes>;
export type RubyFallback<TAttributes extends Record<string, { value: string }>> = CompositeTag<'rp', TAttributes>;
export type RubyText<TAttributes extends Record<string, { value: string }>> = CompositeTag<'rt', TAttributes>;
export type Ruby<TAttributes extends Record<string, { value: string }>> = CompositeTag<'ruby', TAttributes>;
export type Strikethough<TAttributes extends Record<string, { value: string }>> = CompositeTag<'s', TAttributes>;
export type Sample<TAttributes extends Record<string, { value: string }>> = CompositeTag<'samp', TAttributes>;
export type Small<TAttributes extends Record<string, { value: string }>> = CompositeTag<'small', TAttributes>;
export type Strong<TAttributes extends Record<string, { value: string }>> = CompositeTag<'strong', TAttributes>;
export type Subscript<TAttributes extends Record<string, { value: string }>> = CompositeTag<'sub', TAttributes>;
export type Superscript<TAttributes extends Record<string, { value: string }>> = CompositeTag<'sup', TAttributes>;
export type Time<TAttributes extends Record<string, { value: string }>> = CompositeTag<'time', TAttributes>;
export type Underline<TAttributes extends Record<string, { value: string }>> = CompositeTag<'u', TAttributes>;
export type Variable<TAttributes extends Record<string, { value: string }>> = CompositeTag<'var', TAttributes>;
export type WordBreak<TAttributes extends Record<string, { value: string }>> = CompositeTag<'wbr', TAttributes>;
export type Area<TAttributes extends Record<string, { value: string }>> = CompositeTag<'area', TAttributes>;
export type Img<TAttributes extends Record<string, { value: string }>> = Tag<'img', { src: RecordValueType<TAttributes> } & TAttributes>;
export type Map<TAttributes extends Record<string, { value: string }>> = CompositeTag<'map', TAttributes>;
export type Track<TAttributes extends Record<string, { value: string }>> = CompositeTag<'track', TAttributes>;
export type Svg<TAttributes extends Record<string, { value: string }>> = CompositeTag<'svg', TAttributes>;
export type Math<TAttributes extends Record<string, { value: string }>> = CompositeTag<'math', TAttributes>;
export type NoScript<TAttributes extends Record<string, { value: string }>> = TextTag<'noscript', TAttributes>;
export type Script<TAttributes extends Record<string, { value: string }>> = TextTag<'script', { src: RecordValueType<TAttributes>, type: RecordValueType<TAttributes> } & TAttributes>;
export type DeletedText<TAttributes extends Record<string, { value: string }>> = CompositeTag<'del', TAttributes>;
export type InsertedText<TAttributes extends Record<string, { value: string }>> = CompositeTag<'ins', TAttributes>;
export type Caption<TAttributes extends Record<string, { value: string }>> = CompositeTag<'caption', TAttributes>;
export type Column<TAttributes extends Record<string, { value: string }>> = CompositeTag<'column', TAttributes>;
export type ColumnGroup<TAttributes extends Record<string, { value: string }>> = CompositeTag<'columngroup', TAttributes>;
export type Table<TAttributes extends Record<string, { value: string }>> = CompositeTag<'table', TAttributes, (TableHeader<TAttributes> | TableFooter<TAttributes> | TableBody<TAttributes> | TableRow<TAttributes>)[]>;
export type TableBody<TAttributes extends Record<string, { value: string }>> = CompositeTag<'tbody', TAttributes, TableRow<TAttributes>[]>;
export type TableData<TAttributes extends Record<string, { value: string }>> = CompositeTag<'td', TAttributes>;
export type TableFooter<TAttributes extends Record<string, { value: string }>> = CompositeTag<'tfoot', TAttributes, TableRow<TAttributes>[]>;
export type TableHeader<TAttributes extends Record<string, { value: string }>> = CompositeTag<'thead', TAttributes, TableRow<TAttributes>[]>;
export type TableHeading<TAttributes extends Record<string, { value: string }>> = CompositeTag<'th', TAttributes>;
export type TableRow<TAttributes extends Record<string, { value: string }>> = CompositeTag<'tr', TAttributes, (TableData<TAttributes> | TableHeading<TAttributes>)[]>;
export type Button<TAttributes extends Record<string, { value: string }>> = TextTag<'button', TAttributes>;
export type DataList<TAttributes extends Record<string, { value: string }>> = CompositeTag<'datalist', TAttributes, Option<TAttributes>[]>;
export type FieldSet<TAttributes extends Record<string, { value: string }>> = CompositeTag<'fieldset', TAttributes>;
export type Form<TAttributes extends Record<string, { value: string }>> = CompositeTag<'form', TAttributes>;
export type Input<TAttributes extends Record<string, { value: string }>> = CompositeTag<'input', TAttributes>;
export type Label<TAttributes extends Record<string, { value: string }>> = CompositeTag<'label', TAttributes>;
export type Legend<TAttributes extends Record<string, { value: string }>> = CompositeTag<'legend', TAttributes>;
export type Meter<TAttributes extends Record<string, { value: string }>> = CompositeTag<'meter', TAttributes>;
export type OptionsGroup<TAttributes extends Record<string, { value: string }>> = CompositeTag<'optiongroup', TAttributes, Option<TAttributes>[]>;
export type Option<TAttributes extends Record<string, { value: string }>> = TextTag<'option', TAttributes>;
export type Output<TAttributes extends Record<string, { value: string }>> = CompositeTag<'output', TAttributes>;
export type Progress<TAttributes extends Record<string, { value: string }>> = Tag<'progress', TAttributes>;
export type Select<TAttributes extends Record<string, { value: string }>> = CompositeTag<'select', TAttributes, Option<TAttributes>[]>;
export type TextArea<TAttributes extends Record<string, { value: string }>> = TextTag<'textarea', TAttributes>;
export type Details<TAttributes extends Record<string, { value: string }>> = CompositeTag<'details', TAttributes>;
export type Dialog<TAttributes extends Record<string, { value: string }>> = CompositeTag<'dialog', TAttributes>;
export type Summary<TAttributes extends Record<string, { value: string }>> = CompositeTag<'summary', TAttributes>;
export type Slot<TAttributes extends Record<string, { value: string }>> = CompositeTag<'slot', TAttributes>;
export type Template<TAttributes extends Record<string, { value: string }>> = CompositeTag<'template', TAttributes>;
export type Picture<TAttributes extends Record<string, { value: string }>> = Tag<'picture', TAttributes>;
export type Portal<TAttributes extends Record<string, { value: string }>> = Tag<'portal', TAttributes>;
export type Source<TAttributes extends Record<string, { value: string }>> = Tag<'source', TAttributes>;
export type Object<TAttributes extends Record<string, { value: string }>> = Tag<'object', TAttributes>;

export type MetadataTags<TAttributes extends Record<string, { value: string }>> = TextTag<'base', TAttributes> | Tag<'link', TAttributes> | Tag<'meta', TAttributes> | NoScript<TAttributes> | TextTag<'script', TAttributes> | TextTag<'style', TAttributes> | TextTag<'title', TAttributes>;

export type FlowContentTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Anchor<TAttributes> |
    Abbreviation<TAttributes> |
    Address<TAttributes> |
    Article<TAttributes> |
    Aside<TAttributes> |
    Audio<TAttributes> |
    Bold<TAttributes> |
    DirectionSwitch<TAttributes> |
    BidirectionalIsolation<TAttributes> |
    BlockQuote<TAttributes> |
    LineBreak<TAttributes> |
    Button<TAttributes> |
    Canvas<TAttributes> |
    Cite<TAttributes> |
    Code<TAttributes> |
    Data<TAttributes> |
    DataList<TAttributes> |
    DeletedText<TAttributes> |
    Details<TAttributes> |
    Definition<TAttributes> |
    Div<TAttributes> |
    DataList<TAttributes> |
    Emphasis<TAttributes> |
    FieldSet<TAttributes> |
    Figure<TAttributes> |
    Footer<TAttributes> |
    Form<TAttributes> |
    Heading<1, TAttributes> |
    Heading<2, TAttributes> |
    Heading<3, TAttributes> |
    Heading<4, TAttributes> |
    Heading<5, TAttributes> |
    Heading<6, TAttributes> |
    Header<TAttributes> |
    HeadingGroup<TAttributes> |
    HorizontalRow<TAttributes> |
    Idiomatic<TAttributes> |
    Iframe<TAttributes> |
    Img<TAttributes> |
    Input<TAttributes> |
    InsertedText<TAttributes> |
    TextUserInput<TAttributes> |
    Label<TAttributes> |
    Main<TAttributes> |
    Map<TAttributes> |
    Mark<TAttributes> |
    Math<TAttributes> |
    Menu<TAttributes> |
    Meter<TAttributes> |
    Navigation<TAttributes> |
    NoScript<TAttributes> |
    Object<TAttributes> |
    OrderedList<TAttributes> |
    Output<TAttributes> |
    Paragraph<TAttributes> |
    Picture<TAttributes> |
    PreformatedText<TAttributes> |
    Progress<TAttributes> |
    ShortQuote<TAttributes> |
    Ruby<TAttributes> |
    Strikethough<TAttributes> |
    Sample<TAttributes> |
    Script<TAttributes> |
    Section<TAttributes> |
    Select<TAttributes> |
    Small<TAttributes> |
    Span<TAttributes> |
    Strong<TAttributes> |
    Subscript<TAttributes> |
    Superscript<TAttributes> |
    Svg<TAttributes> |
    Table<TAttributes> |
    Template<TAttributes> |
    TextArea<TAttributes> |
    Time<TAttributes> |
    Underline<TAttributes> |
    UnorderedList<TAttributes> |
    Variable<TAttributes> |
    Video<TAttributes> |
    WordBreak<TAttributes> |
    RawText<TAttributes>;

export type SectionningTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Address<TAttributes> | Article<TAttributes> | Aside<TAttributes> | Footer<TAttributes> | Header<TAttributes> | Heading<1, TAttributes> | Heading<2, TAttributes> | Heading<3, TAttributes> | Heading<4, TAttributes> | Heading<5, TAttributes> | Heading<6, TAttributes> |
    HeadingGroup<TAttributes> | Main<TAttributes> | Navigation<TAttributes> | Section<TAttributes>;

export type TextTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    BlockQuote<TAttributes> | DescriptionDetails<TAttributes> | Div<TAttributes> | DescriptionList<TAttributes> | DescriptionTerm<TAttributes> | FigureCaption<TAttributes> | Figure<TAttributes> |
    HorizontalRow<TAttributes> | ListItem<TAttributes> | Menu<TAttributes> | OrderedList<TAttributes> | Paragraph<TAttributes> | PreformatedText<TAttributes> | UnorderedList<TAttributes>;

export type SemanticTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Anchor<TAttributes> | Abbreviation<TAttributes> | Bold<TAttributes> | BidirectionalIsolation<TAttributes> |
    DirectionSwitch<TAttributes> | LineBreak<TAttributes> | Cite<TAttributes> |
    Code<TAttributes> | Data<TAttributes> | Definition<TAttributes> | Emphasis<TAttributes> | Idiomatic<TAttributes> |
    TextUserInput<TAttributes> | Mark<TAttributes> | ShortQuote<TAttributes> |
    RubyFallback<TAttributes> | RubyText<TAttributes> | Ruby<TAttributes> | Strikethough<TAttributes> |
    Sample<TAttributes> | Small<TAttributes> | Strong<TAttributes> | Subscript<TAttributes> |
    Superscript<TAttributes> | Time<TAttributes> | Underline<TAttributes> | Variable<TAttributes> | WordBreak<TAttributes>;

export type MediaTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Area<TAttributes> | Audio<TAttributes> | Img<TAttributes> | Map<TAttributes> | Track<TAttributes> | Video<TAttributes>;

export type EmbeddedContentTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Iframe<TAttributes> | Picture<TAttributes> | Portal<TAttributes> | Source<TAttributes>;

export type SvgAndMathMLTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Svg<TAttributes> | Math<TAttributes>;

export type ScriptingTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Canvas<TAttributes> | NoScript<TAttributes> | Script<TAttributes>;

export type DemarcatingEditsTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    DeletedText<TAttributes> | InsertedText<TAttributes>;

export type TableTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Caption<TAttributes> | Column<TAttributes> | ColumnGroup<TAttributes> | Table<TAttributes> |
    TableBody<TAttributes> | TableData<TAttributes> | TableFooter<TAttributes> | TableHeader<TAttributes> |
    TableRow<TAttributes> | TableHeading<TAttributes>;

export type FormTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Button<TAttributes> | DataList<TAttributes> | FieldSet<TAttributes> | Form<TAttributes> |
    Input<TAttributes> | Label<TAttributes> | Legend<TAttributes> | Meter<TAttributes> |
    OptionsGroup<TAttributes> | Option<TAttributes> | Output<TAttributes> | Progress<TAttributes> |
    Select<TAttributes> | TextArea<TAttributes>;

export type InteractiveTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Details<TAttributes> | Dialog<TAttributes> | Summary<TAttributes>;

export type WebComponentTags<TAttributes extends Record<string, { value: string }> = Record<string, { value: string }>> =
    Slot<TAttributes> | Template<TAttributes>
