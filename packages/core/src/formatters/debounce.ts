import { Event } from "../event-emitter.js";
import { debounce } from "../observables/shared.js";
import { ReversibleFormatter } from "./common.js";

export class Debounce<T> implements ReversibleFormatter<T, Promise<T>>, Disposable
{
    constructor(private delay: number) { }
    [Symbol.dispose](): void
    {
        if (this.timeout)
            clearTimeout(this.timeout);
        this.event[Symbol.dispose]();
    }
    private timeout: ReturnType<typeof setTimeout>;
    private event: Event<[T]> = new Event(100);

    unformat(value: T): Promise<T>
    {
        return new Promise(resolve =>
        {
            debounce(this.event, this.delay).addListener(resolve, { once: true });
            this.event.emit(value);
        })
    }
    format(value: T): T
    {
        return value;
    }
}