import { MiddlewarePromise } from '@akala/core';
import { Container, Metadata } from '../index.browser.js';
import { Command } from '../metadata/command.js';
import { CommandMetadataProcessorSignature, ICommandProcessor, StructuredParameters } from '../model/processor.js';
import { JSONSchema7, JSONSchema7Definition, ValidationError, validate } from 'json-schema';

export interface SchemaConfiguration extends Metadata.Configuration
{
    schema: Record<string, JSONSchema7Definition>;
}

export class SchemaValidationError extends Error
{
    constructor(errors: ValidationError[])
    {
        super(errors.map(err => err.property + ':' + err.message).join('\n'))
    }
}

export class SchemaValidator implements ICommandProcessor
{
    public readonly name = 'schema';

    constructor(private options: Partial<{ runWhenNoSchema: boolean }> = { runWhenNoSchema: true })
    {
    }
    handle(_origin: Container<unknown>, cmd: Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        if (cmd?.config?.schema)
        {
            const schema: JSONSchema7 = {
                $defs: cmd.config.schema.schema,
                type: "array",
                items: cmd.config.schema.inject.map(x => ({ $ref: x }))
            }
            const validationResult = validate(param.param, schema);

            if (!validationResult.valid)
                return Promise.resolve(new SchemaValidationError(validationResult.errors))
            return Promise.reject();
        }
        if (!this.options.runWhenNoSchema)
            return Promise.resolve(new Error(`There is no schema for command ${cmd.name} and the configuration for the schema validator prevents running commands without schema`));
        return Promise.reject();
    }
}