export interface Document extends Tag<'html'>
{
    head?: Partial<{ title: string, meta: Record<string, string>, jsInit: Script[], links: { rel: string, src: string }[], favicon: string, }>,
    body: FlowContentTags[],
}

export interface Tag<T, TAttributes extends Record<string, string> = Record<string, string>>
{
    type: T
    classes?: string[]
    attributes?: TAttributes
}

export interface TextTag<T, TAttributes extends Record<string, string> = Record<string, string>> extends Tag<T, TAttributes>
{
    content: string;
}

export type RawText = TextTag<'', {}>

export interface CompositeTag<T, TTags extends Tag<any>[] = FlowContentTags[], TAttributes extends Record<string, string> = Record<string, string>> extends Tag<T, TAttributes>
{
    content?: TTags;
}

export type Anchor = CompositeTag<'a', FlowContentTags[], { href: string; target?: '_blank'; }>

export type Paragraph = CompositeTag<'p'>;
export type Span = CompositeTag<'span'>;
export type Div = CompositeTag<'div'>;
export type Audio = CompositeTag<'audio'>;
export type Video = CompositeTag<'video'>;
export type Canvas = CompositeTag<'canvas'>;
export type Frame = Tag<'iframe'> & { src: string };
export type Iframe = Frame;
export type Address = CompositeTag<'address'>;
export type Article = CompositeTag<'article'>;
export type Aside = CompositeTag<'aside'>;
export type Footer = CompositeTag<'Footer'>;
export type Header = CompositeTag<'header'>;
export type Heading<X extends 1 | 2 | 3 | 4 | 5 | 6> = CompositeTag<`h${X}`>;
export type HeadingGroup = CompositeTag<'hgroup'>;
export type Main = CompositeTag<'main'>;
export type Navigation = CompositeTag<'nav'>;
export type Section = CompositeTag<'section'>;
export type BlockQuote = CompositeTag<'blockquote'>;
export type DescriptionDetails = CompositeTag<'dd'>;
export type DescriptionList = CompositeTag<'dl'>;
export type DescriptionTerm = CompositeTag<'dt'>;
export type FigureCaption = CompositeTag<'figcaption'>;
export type Figure = CompositeTag<'figure'>;
export type HorizontalRow = Tag<'hr'>;
export type ListItem = CompositeTag<'li'>;
export type Menu = CompositeTag<'menu'>;
export type OrderedList = CompositeTag<'ol', ListItem[]>;
export type PreformatedText = Tag<'pre'>;
export type UnorderedList = CompositeTag<'ul', ListItem[]>;
export type Abbreviation = CompositeTag<'abbr'>;
export type Bold = CompositeTag<'b'>;
export type BidirectionalIsolation = CompositeTag<'bdi'>;
export type DirectionSwitch = CompositeTag<'bdo'>;
export type LineBreak = Tag<'br'>;
export type Cite = CompositeTag<'cite'>;
export type Code = CompositeTag<'code'>;
export type Data = CompositeTag<'data'>;
export type Definition = CompositeTag<'dfn'>;
export type Emphasis = CompositeTag<'em'>;
export type Idiomatic = CompositeTag<'i'>;
export type TextUserInput = CompositeTag<'kbd'>;
export type Mark = CompositeTag<'mark'>;
export type ShortQuote = CompositeTag<'q'>;
export type RubyFallback = CompositeTag<'rp'>;
export type RubyText = CompositeTag<'rt'>;
export type Ruby = CompositeTag<'ruby'>;
export type Strikethough = CompositeTag<'s'>;
export type Sample = CompositeTag<'samp'>;
export type Small = CompositeTag<'small'>;
export type Strong = CompositeTag<'strong'>;
export type Subscript = CompositeTag<'sub'>;
export type Superscript = CompositeTag<'sup'>;
export type Time = CompositeTag<'time'>;
export type Underline = CompositeTag<'u'>;
export type Variable = CompositeTag<'var'>;
export type WordBreak = CompositeTag<'wbr'>;
export type Area = CompositeTag<'area'>;
export type Img = Tag<'img'> & { src: string };
export type Map = CompositeTag<'map'>;
export type Track = CompositeTag<'track'>;
export type Svg = CompositeTag<'svg'>;
export type Math = CompositeTag<'math'>;
export type NoScript = TextTag<'noscript'>;
export type Script = TextTag<'script', { src: string, type: string }>;
export type DeletedText = CompositeTag<'del'>;
export type InsertedText = CompositeTag<'ins'>;
export type Caption = CompositeTag<'caption'>;
export type Column = CompositeTag<'column'>;
export type ColumnGroup = CompositeTag<'columngroup'>;
export type Table = CompositeTag<'table', (TableHeader | TableFooter | TableBody | TableRow)[]>;
export type TableBody = CompositeTag<'tbody', TableRow[]>;
export type TableData = CompositeTag<'td'>;
export type TableFooter = CompositeTag<'tfoot', TableRow[]>;
export type TableHeader = CompositeTag<'thead', TableRow[]>;
export type TableHeading = CompositeTag<'th'>;
export type TableRow = CompositeTag<'tr', (TableData | TableHeading)[]>;
export type Button = TextTag<'button'>;
export type DataList = CompositeTag<'datalist', Option[]>;
export type FieldSet = CompositeTag<'fieldset'>;
export type Form = CompositeTag<'form'>;
export type Input = CompositeTag<'input'>;
export type Label = CompositeTag<'label'>;
export type Legend = CompositeTag<'legend'>;
export type Meter = CompositeTag<'meter'>;
export type OptionsGroup = CompositeTag<'optiongroup', Option[]>;
export type Option = TextTag<'option'>;
export type Output = CompositeTag<'output'>;
export type Progress = Tag<'progress'>;
export type Select = CompositeTag<'select', Option[]>;
export type TextArea = TextTag<'textarea'>;
export type Details = CompositeTag<'details'>;
export type Dialog = CompositeTag<'dialog'>;
export type Summary = CompositeTag<'summary'>;
export type Slot = CompositeTag<'slot'>;
export type Template = CompositeTag<'template'>;
export type Picture = Tag<'picture'>;
export type Portal = Tag<'portal'>;
export type Source = Tag<'source'>;
export type Object = Tag<'object'>;

export type MetadataTags = TextTag<'base'> | Tag<'link'> | Tag<'meta'> | NoScript | TextTag<'script'> | TextTag<'style'> | TextTag<'title'>;

export type FlowContentTags =
    Anchor |
    Abbreviation |
    Address |
    Article |
    Aside |
    Audio |
    Bold |
    DirectionSwitch |
    BidirectionalIsolation |
    BlockQuote |
    LineBreak |
    Button |
    Canvas |
    Cite |
    Code |
    Data |
    DataList |
    DeletedText |
    Details |
    Definition |
    Div |
    DataList |
    Emphasis |
    FieldSet |
    Figure |
    Footer |
    Form |
    Heading<1> |
    Heading<2> |
    Heading<3> |
    Heading<4> |
    Heading<5> |
    Heading<6> |
    Header |
    HeadingGroup |
    HorizontalRow |
    Idiomatic |
    Iframe |
    Img |
    Input |
    InsertedText |
    TextUserInput |
    Label |
    Main |
    Map |
    Mark |
    Math |
    Menu |
    Meter |
    Navigation |
    NoScript |
    Object |
    OrderedList |
    Output |
    Paragraph |
    Picture |
    PreformatedText |
    Progress |
    ShortQuote |
    Ruby |
    Strikethough |
    Sample |
    Script |
    Section |
    Select |
    Small |
    Span |
    Strong |
    Subscript |
    Superscript |
    Svg |
    Table |
    Template |
    TextArea |
    Time |
    Underline |
    UnorderedList |
    Variable |
    Video |
    WordBreak |
    RawText;

export type SectionningTags =
    Address | Article | Aside | Footer | Header | Heading<1> | Heading<2> | Heading<3> | Heading<4> | Heading<5> | Heading<6> |
    HeadingGroup | Main | Navigation | Section;

export type TextTags =
    BlockQuote | DescriptionDetails | Div | DescriptionList | DescriptionTerm | FigureCaption | Figure |
    HorizontalRow | ListItem | Menu | OrderedList | Paragraph | PreformatedText | UnorderedList;

export type SemanticTags =
    Anchor | Abbreviation | Bold | BidirectionalIsolation | DirectionSwitch | LineBreak | Cite |
    Code | Data | Definition | Emphasis | Idiomatic | TextUserInput | Mark | ShortQuote | RubyFallback |
    RubyText | Ruby | Strikethough | Sample | Small | Strong | Subscript | Superscript | Time | Underline | Variable | WordBreak;

export type MediaTags =
    Area | Audio | Img | Map | Track | Video;

export type EmbeddedContentTags =
    Iframe | Picture | Portal | Source;

export type SvgAndMathMLTags =
    Svg | Math;

export type ScriptingTags =
    Canvas | NoScript | Script;

export type DemarcatingEditsTags =
    DeletedText | InsertedText;

export type TableTags =
    Caption | Column | ColumnGroup | Table | TableBody | TableData | TableFooter | TableHeader | TableRow | TableHeading;

export type FormTags =
    Button | DataList | FieldSet | Form | Input | Label | Legend | Meter | OptionsGroup | Option | Output | Progress | Select | TextArea;

export type InteractiveTags =
    Details | Dialog | Summary;

export type WebComponentTags =
    Slot | Template
