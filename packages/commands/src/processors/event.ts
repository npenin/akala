import type { StructuredParameters, ICommandProcessor, CommandMetadataProcessorSignature } from '../model/processor.js';
// import { CommandProxy } from '../model/command';
import { type MiddlewarePromise, EventEmitter, type MiddlewareResult, Event } from "@akala/core";
import { type Command } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { protocolHandlers as handlers } from '../protocol-handler.js';

handlers.useProtocol('event', async (_url, options, inner) => ({ processor: new EventProcessor(inner.processor, options.signal), getMetadata: inner.getMetadata }));

export type ProcessingCommand<T extends string> = `processing.${T}`
export type ProcessedCommand<T extends string> = `processed.${T}`
export type ProcessingFailedCommand<T extends string> = `processing-failed.${T}`

export class EventProcessor extends EventEmitter<{
    processing: Event<CommandMetadataProcessorSignature<unknown>>,
    'processing-failed': Event<[...CommandMetadataProcessorSignature<unknown>, error: MiddlewareResult]>,
    processed: Event<[...CommandMetadataProcessorSignature<unknown>, result: unknown]>,
}
    & { [key in ProcessedCommand<string>]: Event<[...CommandMetadataProcessorSignature<unknown>, result: unknown]> }
    & { [key in ProcessingCommand<string>]: Event<CommandMetadataProcessorSignature<unknown>> }
    & { [key in ProcessingFailedCommand<string>]: Event<[...CommandMetadataProcessorSignature<unknown>, error: MiddlewareResult]> }
> implements ICommandProcessor
{
    public name = 'event';

    constructor(public readonly processor: ICommandProcessor, signal?: AbortSignal)
    {
        super();
        signal?.addEventListener('abort', () => this[Symbol.dispose](), { once: true })
    }

    async handle(origin: Container<unknown>, command: Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        this.emit(`processing.${command.name}`, origin, command, param);
        this.emit('processing', origin, command, param);
        try
        {
            const err = await this.processor.handle(origin, command, param)
            this.emit(`processing-failed.${command.name}`, origin, command, param, err);
            this.emit('processing-failed', origin, command, param, err);
            return err;
        }
        catch (result)
        {
            this.emit(`processed.${command.name}`, origin, command, param, result);
            this.emit('processed', origin, command, param, result);
            throw result;
        }
    }
}
