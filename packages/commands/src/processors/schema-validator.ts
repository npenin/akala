import { MiddlewarePromise } from '@akala/core';
import { Container, Metadata } from '../index.browser.js';
import { Command } from '../metadata/command.js';
import { CommandMetadataProcessorSignature, ICommandProcessor, StructuredParameters } from '../model/processor.js';
import Ajv, { Schema, ErrorObject } from 'ajv';

export interface SchemaConfiguration extends Metadata.Configuration
{
    schema: Record<string, Schema>;
}

export class SchemaValidationError extends Error
{
    constructor(errors: ErrorObject[])
    {
        super(errors.map(err => err.propertyName + ':' + err.message).join('\n'))
    }
}

export class SchemaValidator implements ICommandProcessor
{
    public readonly name = 'schema';

    constructor(private options: Partial<{ runWhenNoSchema: boolean }> = { runWhenNoSchema: true })
    {
    }
    async handle(origin: Container<unknown>, cmd: Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        if (cmd?.config?.schema && cmd.config.fs)
        {
            const schema: Schema = {
                $defs: cmd.config.schema.schema,
                type: "array",
                prefixItems: cmd.config.schema.inject.map(x => ({ $ref: x })),
                items: false
            }

            const ajv = new Ajv.default();
            const validationResult = ajv.validate(schema, param.param)

            if (!validationResult)
                return Promise.resolve(new SchemaValidationError(ajv.errors))
            return Promise.reject();
        }
        if (!this.options.runWhenNoSchema)
            return Promise.resolve(new Error(`There is no schema for command ${cmd.name} and the configuration for the schema validator prevents running commands without schema`));
        return Promise.reject();
    }
}