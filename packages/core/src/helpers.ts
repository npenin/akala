export type Remote<T> = { [key in keyof T]: T[key] extends (...args) => infer X ? X extends Promise<unknown> ? X : Promise<X> : (T[key] | undefined) }
export type Serializable = string | number | string[] | number[] | boolean | boolean[] | SerializableObject | SerializableObject[];
export type TypedSerializable<T> = T extends Array<infer U> ? TypedSerializable<U>[] : string | number | boolean | TypedSerializableObject<T>;
export type SerializableObject = { [key: string]: Serializable };
export type TypedSerializableObject<T> = { [key in keyof T]: TypedSerializable<T> };

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
export function noop() { }

export function lazy<T>(factory: () => T)
{
    var instance: T;
    return function ()
    {
        return instance || (instance = factory());
    }
}

export interface Translator
{
    (key: string): string;
    (format: string, ...parameters: unknown[]): string;
    (obj: { key: string, fallback: string }): string;
    (obj: { key: string, fallback: string }, ...parameters: unknown[]): string;
}
