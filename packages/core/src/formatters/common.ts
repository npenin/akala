// export type Formatter<TResult> = (value: unknown) => TResult;
// export type ReversibleFormatter<TResult, TOrigin> = Injected<TResult & { reverse: (value: TResult) => TOrigin }>;

export interface Formatter<TResult>
{
    format(value: unknown): TResult;
}

export interface ReversibleFormatter<TResult, TOrigin> extends Formatter<TResult>
{
    unformat(value: TResult): TOrigin;
}

export type FormatterFactory<TResult, TSettings extends unknown[] = unknown[]> = new (...args: TSettings) => Formatter<TResult>
export type ReversibleFormatterFactory<TResult, TOrigin, TSettings extends unknown[] = unknown[]> = new (...args: TSettings) => ReversibleFormatter<TResult, TOrigin>

export function isReversible<T, TArgs extends unknown[]>(formatter: (new (...args: TArgs) => Formatter<T>)): formatter is (new (...args: TArgs) => Formatter<T> & ReversibleFormatter<T, unknown>)
export function isReversible<T>(formatter: Formatter<T>): formatter is ReversibleFormatter<T, unknown>
export function isReversible<T, TArgs extends unknown[]>(formatter: Formatter<T> | (new (...args: TArgs) => Formatter<T>)): formatter is ReversibleFormatter<T, unknown> | (new (...args: TArgs) => Formatter<T> & ReversibleFormatter<T, unknown>)
{
    switch (typeof formatter)
    {
        case 'function':
            return 'unformat' in formatter.prototype && typeof formatter.prototype.unformat == 'function';
        case 'object':
            return 'unformat' in formatter && typeof formatter.unformat == 'function';
        default:
            return false;
    }
}