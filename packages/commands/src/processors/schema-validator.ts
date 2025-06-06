import { InjectorMap, MiddlewarePromise } from '@akala/core';
import { Container, Metadata } from '../index.browser.js';
import { Command } from '../metadata/command.js';
import { ICommandProcessor, StructuredParameters } from '../model/processor.js';
import Ajv, { ErrorObject, SchemaObject } from 'ajv';

export interface SchemaConfiguration extends Metadata.Configuration
{
    $defs: Record<string, SchemaObject>;
    resultSchema?: SchemaObject;
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

    static readonly notRefTypes = ["string", "number", "integer", "boolean", "array"]

    async handle(origin: Container<unknown>, cmd: Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        if (cmd?.config?.schema && cmd.config.fs)
        {
            const schema: SchemaObject = {
                $defs: cmd.config.schema.$defs,
                type: "array",
                prefixItems: new InjectorMap(x => typeof x == 'string' ? SchemaValidator.notRefTypes.includes(x) ? x : { $ref: x } : x).resolve(cmd.config.schema.inject),
                items: false
            }

            const ajv = new Ajv.default();
            const validationResult = ajv.validate(schema, param.params)

            if (!validationResult)
                return Promise.resolve(new SchemaValidationError(ajv.errors))
            return Promise.reject();
        }
        if (!this.options.runWhenNoSchema)
            return Promise.resolve(new Error(`There is no schema for command ${cmd.name} and the configuration for the schema validator prevents running commands without schema`));
        return Promise.reject();
    }
}
