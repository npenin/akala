import { Connection as BaseConnection } from './shared-connection.js';
import { default as Client } from './shared-client.js';
import { default as Errors } from './errors.js';
import { Deferred } from '@akala/core';
import debug from 'debug';
const logger = debug('json-rpc-ws');
import * as ws from './ws/browser.js';
export { ws };
export { Client, Errors, BaseConnection };
class ByobReader {
    stream;
    reader;
    constructor(stream) {
        this.stream = stream;
        this.reader = new DefaultReader(stream);
        this.reader.releaseLock();
    }
    emitError(error) {
        this.reader.emitError(error);
    }
    get closed() {
        return this.reader.closed;
    }
    cancel(reason) {
        return this.reader.cancel(reason);
    }
    push(...chunks) {
        this.reader.push(...chunks);
    }
    read(view) {
        return this.reader.read().then(v => {
            if (!v.done) {
                view.byteOffset = v.value.byteOffset;
                view.byteLength = v.value.byteLength;
                view.buffer = v.value.buffer;
            }
            return { done: v.done, value: view };
        });
    }
    releaseLock() {
        if (this.stream.reader === this.reader)
            this.stream.reader = undefined;
    }
}
class DefaultReader {
    stream;
    next;
    constructor(stream) {
        this.stream = stream;
    }
    emitError(error) {
        if (!this.next)
            this.next = new Deferred();
        this.next.reject(error);
        return this.next;
    }
    push(...chunks) {
        if (chunks.length == 0)
            return;
        const totalLength = chunks.reduce((l, chunk) => l + (chunk === null ? 0 : chunk.byteLength - chunk.byteOffset), 0);
        if (totalLength === 0) {
            if (!this.next)
                this.next = new Deferred();
            return this.next.resolve({ done: true });
        }
        const buffer = new Uint8Array(totalLength);
        let start = 0;
        let chunk = undefined;
        for (chunk of chunks) {
            if (chunk === null)
                break;
            for (let i = chunk.byteOffset; i < chunk.byteLength; i++) {
                buffer[start++] = chunk[i];
            }
        }
        if (!this.next)
            this.next = new Deferred();
        this.next.resolve({ value: buffer, done: false });
        if (chunk === null) {
            this.next = new Deferred();
            this.next.resolve({ done: true });
            this.closed.resolve();
        }
    }
    closed = new Deferred();
    cancel(reason) {
        if (this.next)
            return this.next.then(() => Promise.reject(reason));
        else
            return Promise.reject(reason);
    }
    read() {
        if (!this.next)
            this.next = new Deferred();
        this.next.finally(() => this.next = undefined);
        return this.next;
    }
    releaseLock() {
        if (this.stream.reader === this)
            this.stream.reader = undefined;
    }
}
class Readable {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    forEach(callbackfn, thisArg) {
        return this.buffer.forEach((x, i) => callbackfn(x, i, thisArg || this));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entries() {
        return this.buffer.entries();
    }
    keys() {
        return this.buffer.keys();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values() {
        return this.buffer.values();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [Symbol.iterator]() {
        return this.buffer[Symbol.iterator]();
    }
    buffer = [];
    _reader;
    target;
    get reader() {
        return this._reader;
    }
    set reader(reader) {
        this._reader = reader;
        if (reader && this.buffer.length) {
            reader.push(...this.buffer);
        }
    }
    get locked() {
        return !!this.reader && !this.target;
    }
    cancel(_reason) {
        if (this.reader)
            return this.reader.cancel(_reason);
        if (this.target)
            return this.target.abort(_reason);
        return Promise.resolve();
    }
    emitError(error) {
        if (this.reader)
            return this.reader.emitError(error);
        if (this.target)
            return this.target.abort(error);
    }
    push(chunk) {
        if (!this.reader)
            this.buffer.push(chunk);
        else
            this.reader.push(chunk);
    }
    getReader(options) {
        if (this.locked)
            throw new Error('stream is already locked');
        if (options && options.mode === 'byob') {
            return this.reader = new ByobReader(this);
        }
        return this.reader = new DefaultReader(this);
    }
    pipeThrough({ writable, readable }, options) {
        this.pipeTo(writable, options);
        return readable;
    }
    async pipeTo(dest, options) {
        this.target = dest;
        const writer = dest.getWriter();
        let chunk;
        while (typeof (chunk = this.buffer.shift()) != 'undefined') {
            if (chunk)
                await writer.write(chunk);
            if (chunk === null && options && options.preventClose)
                await writer.close();
        }
    }
    tee() {
        throw new Error("Method not implemented.");
    }
}
export class Connection extends BaseConnection {
    constructor(socket, parent) {
        super(socket, parent);
    }
    async sendStream(id, result) {
        const reader = result.getReader();
        const chunk = await reader.read();
        if (!chunk.done && this.socket.open)
            this.sendRaw({ id: id, result: { event: 'data', isBuffer: true, data: { type: 'Buffer', data: chunk.value } } });
        else if (this.socket.open)
            this.sendRaw({ id: id, result: { event: 'end' }, stream: false });
        else
            logger('socket was closed before end of stream');
    }
    isStream(result) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return typeof (result) != 'undefined' && !!result && typeof (result.getReader) == 'function';
    }
    buildStream(id, result) {
        const s = new Readable();
        const src = result;
        Object.getOwnPropertyNames(src).forEach(function (p) {
            if (Object.getOwnPropertyDescriptor(result, p) == null) {
                const prop = Object.getOwnPropertyDescriptor(src, p);
                if (prop)
                    Object.defineProperty(result, p, prop);
            }
        });
        const f = this.responseHandlers[id] = (error, result) => {
            if (error)
                s.emitError(error);
            else
                switch (result.event) {
                    case 'data':
                        if (result.data)
                            s.push(Uint8Array.from(result.data.data));
                        this.responseHandlers[id] = f;
                        break;
                    case 'end':
                        s.push(null);
                        break;
                }
        };
        return s;
    }
}
//# sourceMappingURL=browser.js.map