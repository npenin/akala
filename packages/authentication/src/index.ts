import { Middleware, MiddlewarePromise, SpecialNextParam, base64 } from "@akala/core";
import { CommandMetadataProcessorSignature, CommandProcessor, Container, ICommandProcessor, Metadata, StructuredParameters } from "@akala/commands";
export * from './jwt.js'

export class AuthMiddleware<T extends unknown[], TNextSpecialParam extends string | void = SpecialNextParam> implements Middleware<T, TNextSpecialParam>
{
    constructor(private validate: (...args: T) => Promise<void>)
    {

    }

    async handle(...context: T): MiddlewarePromise<TNextSpecialParam>
    {
        try
        {
            await this.validate(...context);
            return undefined;
        }
        catch (e)
        {
            return e;
        }
    }
}

export class AuthProcessorMiddleware<T> extends AuthMiddleware<CommandMetadataProcessorSignature<T>> implements ICommandProcessor
{
    constructor(validate: (...args: CommandMetadataProcessorSignature<T>) => Promise<void>)
    {
        super(validate);
    }
}