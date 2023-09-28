import { control } from "../helpers/control.js";
import { func } from "../helpers/func.js";
import { local } from "../helpers/local.js";
import { memory, usize } from "../helpers/memory.js";
import { i32, mergeUInt8Arrays } from "../helpers/types.js";
import { Runtime } from "./runtime.js";

type ESString = StringConstructor['prototype'];

export class CharStringConstructor implements ESString
{
    constructor(private runtime: Runtime, private address: usize<bigint | number>)
    {

    }

    private static CharAt = (() =>
    {
        {
            const char = new local(0, i32);
            const pos = new local(1, address.type)
            return func.new([address, pos], [i32], [i], mergeUInt8Arrays(
                control.for(i.set(address.type.const(0)), i.get().lt_u(this.byteLength), i.set(i.get().add(this.address.type.const(1))),
                    mergeUInt8Arrays(
                        control.ifelse(undefined, i32.load8_u(this.runtime.allocator.memory_start, this.address.get()).and(i32.const(0x80)).eqz(),
                            mergeUInt8Arrays(
                                i32.load8_u(this.runtime.allocator.memory_start, this.address.add(i.get()))
                            )
                        )
                    )
                )
            ));
        }
    })();

    charAt(pos: i32): String
    {
        return this.runtime.call(this.CharAt, [this.address, pos], [i => ])
    }

    charCodeAt(index: number): number
    {
        throw new Error("Method not implemented.");
    }
    concat(...strings: string[]): string
    {
        throw new Error("Method not implemented.");
    }
    indexOf(searchString: string, position?: number): number
    {
        throw new Error("Method not implemented.");
    }
    lastIndexOf(searchString: string, position?: number): number
    {
        throw new Error("Method not implemented.");
    }
    localeCompare(that: string): number;
    localeCompare(that: string, locales?: string | string[], options?: Intl.CollatorOptions): number;
    localeCompare(that: unknown, locales?: unknown, options?: unknown): number
    {
        throw new Error("Method not implemented.");
    }
    match(regexp: string | RegExp): RegExpMatchArray;
    match(matcher: { [Symbol.match](string: string): RegExpMatchArray; }): RegExpMatchArray;
    match(matcher: unknown): RegExpMatchArray
    {
        throw new Error("Method not implemented.");
    }
    replace(searchValue: string | RegExp, replaceValue: string): string;
    replace(searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
    replace(searchValue: { [Symbol.replace](string: string, replaceValue: string): string; }, replaceValue: string): string;
    replace(searchValue: { [Symbol.replace](string: string, replacer: (substring: string, ...args: any[]) => string): string; }, replacer: (substring: string, ...args: any[]) => string): string;
    replace(searchValue: unknown, replacer: unknown): string
    {
        throw new Error("Method not implemented.");
    }
    search(regexp: string | RegExp): number;
    search(searcher: { [Symbol.search](string: string): number; }): number;
    search(searcher: unknown): number
    {
        throw new Error("Method not implemented.");
    }
    slice(start?: number, end?: number): string
    {
        throw new Error("Method not implemented.");
    }
    split(separator: string | RegExp, limit?: number): string[];
    split(splitter: { [Symbol.split](string: string, limit?: number): string[]; }, limit?: number): string[];
    split(splitter: unknown, limit?: unknown): string[]
    {
        throw new Error("Method not implemented.");
    }
    substring(start: number, end?: number): string
    {
        throw new Error("Method not implemented.");
    }
    toLowerCase(): string
    {
        throw new Error("Method not implemented.");
    }
    toLocaleLowerCase(locales?: string | string[]): string
    {
        throw new Error("Method not implemented.");
    }
    toUpperCase(): string
    {
        throw new Error("Method not implemented.");
    }
    toLocaleUpperCase(locales?: string | string[]): string
    {
        throw new Error("Method not implemented.");
    }
    trim(): string
    {
        throw new Error("Method not implemented.");
    }
    length: number;
    substr(from: number, length?: number): string
    {
        throw new Error("Method not implemented.");
    }
    valueOf(): string
    {
        throw new Error("Method not implemented.");
    }
    codePointAt(pos: number): number
    {
        throw new Error("Method not implemented.");
    }
    includes(searchString: string, position?: number): boolean
    {
        throw new Error("Method not implemented.");
    }
    endsWith(searchString: string, endPosition?: number): boolean
    {
        throw new Error("Method not implemented.");
    }
    normalize(form: "NFC" | "NFD" | "NFKC" | "NFKD"): string;
    normalize(form?: string): string;
    normalize(form?: unknown): string
    {
        throw new Error("Method not implemented.");
    }
    repeat(count: number): string
    {
        throw new Error("Method not implemented.");
    }
    startsWith(searchString: string, position?: number): boolean
    {
        throw new Error("Method not implemented.");
    }
    anchor(name: string): string
    {
        throw new Error("Method not implemented.");
    }
    big(): string
    {
        throw new Error("Method not implemented.");
    }
    blink(): string
    {
        throw new Error("Method not implemented.");
    }
    bold(): string
    {
        throw new Error("Method not implemented.");
    }
    fixed(): string
    {
        throw new Error("Method not implemented.");
    }
    fontcolor(color: string): string
    {
        throw new Error("Method not implemented.");
    }
    fontsize(size: number): string;
    fontsize(size: string): string;
    fontsize(size: unknown): string
    {
        throw new Error("Method not implemented.");
    }
    italics(): string
    {
        throw new Error("Method not implemented.");
    }
    link(url: string): string
    {
        throw new Error("Method not implemented.");
    }
    small(): string
    {
        throw new Error("Method not implemented.");
    }
    strike(): string
    {
        throw new Error("Method not implemented.");
    }
    sub(): string
    {
        throw new Error("Method not implemented.");
    }
    sup(): string
    {
        throw new Error("Method not implemented.");
    }
    padStart(maxLength: number, fillString?: string): string
    {
        throw new Error("Method not implemented.");
    }
    padEnd(maxLength: number, fillString?: string): string
    {
        throw new Error("Method not implemented.");
    }
    trimEnd(): string
    {
        throw new Error("Method not implemented.");
    }
    trimStart(): string
    {
        throw new Error("Method not implemented.");
    }
    trimLeft(): string
    {
        throw new Error("Method not implemented.");
    }
    trimRight(): string
    {
        throw new Error("Method not implemented.");
    }
    matchAll(regexp: RegExp): IterableIterator<RegExpMatchArray>
    {
        throw new Error("Method not implemented.");
    }
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;
    replaceAll(searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
    replaceAll(searchValue: unknown, replacer: unknown): string
    {
        throw new Error("Method not implemented.");
    }
    at(index: number): string
    {
        throw new Error("Method not implemented.");
    }
    [Symbol.iterator](): IterableIterator<string>
    {
        throw new Error("Method not implemented.");
    }



    public get byteLength() { return this.address.type.load(this.runtime.allocator.memory_start, this.address) }



    public append(b: String)
    {
        const x = new local<usize<bigint | number>>(0, this.address.type);
        const y = new local<usize<bigint | number>>(0, this.address.type);
        const l = new local<usize<bigint | number>>(0, this.address.type);
        return func.new([x, y], [i32], [l], mergeUInt8Arrays(
            this.runtime.arch.copy(l.tee(this.runtime.allocator.malloc(this.byteLength.add(b.byteLength))), this.address, this.byteLength).toOpCodes(),
            this.runtime.arch.copy(l.get().add(this.byteLength), b.address, b.byteLength).toOpCodes(),
            l.get().toOpCodes(),
        ))
    }

    public prepend(b: String)
    {
        return b.append(this);
    }


}