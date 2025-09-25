import { JsonSchema } from '@akala/commands';
import { ProtoAST, MessageDefinition, FieldDefinition, EnumDefinition } from './grpc-proto-parser.js';


export class ProtoToJsonSchemaConverter
{
    private definitions: { [key: string]: JsonSchema; } = {};
    private collectedTypes: Set<string> = new Set();

    convert(ast: ProtoAST): JsonSchema
    {
        // First, collect all type names
        this.collectedTypes = this.collectTypeNames(ast);

        this.definitions = {};

        // Process all types first to build definitions
        this.processTypes(ast);

        // Create main schema
        const schema: JsonSchema = {
            $schema: 'https://json-schema.org/draft-07/schema#',
            type: 'object',
            properties: {},
            $defs: this.definitions
        };

        if (ast.package)
        {
            schema.title = ast.package;
        }

        return schema;
    }

    private collectTypeNames(ast: ProtoAST): Set<string>
    {
        const names = new Set<string>();

        // Process enums
        for (const enumDef of ast.enums)
        {
            names.add(enumDef.name);
        }

        // Process messages
        for (const message of ast.messages)
        {
            this.collectMessageTypeNames(message, '', names);
        }

        return names;
    }

    private collectMessageTypeNames(message: MessageDefinition, prefix: string, names: Set<string>): void
    {
        const fullName = prefix ? `${prefix}.${message.name}` : message.name;

        names.add(fullName);

        // Process nested messages
        if (message.nested?.messages?.length)
        {
            for (const nested of message.nested.messages)
            {
                this.collectMessageTypeNames(nested, fullName, names);
            }
        }

        // Process nested enums
        if (message.nested?.enums?.length)
        {
            for (const enumDef of message.nested.enums)
            {
                names.add(`${fullName}.${enumDef.name}`);
            }
        }
    }

    private processTypes(ast: ProtoAST): void
    {
        // Process enums
        for (const enumDef of ast.enums)
        {
            this.definitions[enumDef.name] = this.enumToSchema(enumDef);
        }

        // Process messages
        for (const message of ast.messages)
        {
            this.processMessage(message, '');
        }
    }

    private processMessage(message: MessageDefinition, prefix?: string): void
    {
        const fullName = prefix ? `${prefix}.${message.name}` : message.name;

        // Process nested messages
        if (message.nested?.messages?.length)
        {
            for (const nested of message.nested.messages)
            {
                this.processMessage(nested, fullName);
            }
        }

        // Process nested enums
        if (message.nested?.enums?.length)
        {
            for (const enumDef of message.nested.enums)
            {
                const enumFullName = `${fullName}.${enumDef.name}`;
                this.definitions[enumFullName] = this.enumToSchema(enumDef);
            }
        }

        this.definitions[fullName] = this.messageToSchema(message, fullName);
    }

    private messageToSchema(message: MessageDefinition, prefix?: string): JsonSchema
    {
        const schema: JsonSchema = {
            type: 'object',
            properties: {},
            additionalProperties: false
        };

        const required: string[] = [];

        // Process regular fields
        for (const field of message.fields)
        {
            schema.properties![field.name] = this.fieldToSchema(field, prefix);

            if (!field.optional)
            {
                required.push(field.name);
            }
        }

        // Process oneofs
        for (const oneof of message.oneofs)
        {
            const oneofSchema: JsonSchema = {
                type: 'object',
                oneOf: []
            };

            for (const field of oneof.fields)
            {
                const variant: JsonSchema = {
                    type: 'object',
                    properties: {
                        [field.name]: this.fieldToSchema(field, prefix)
                    },
                    required: [field.name],
                    additionalProperties: false
                };
                oneofSchema.oneOf!.push(variant);
            }

            schema.properties![oneof.name] = oneofSchema;
        }

        if (required.length > 0)
        {
            schema.required = required;
        }

        return schema;
    }

    private fieldToSchema(field: FieldDefinition, prefix?: string): JsonSchema
    {
        let schema: JsonSchema = this.typeToSchema(field.type, prefix);

        if (field.repeated)
        {
            schema = {
                type: 'array',
                items: schema
            };
        }

        return schema;
    }

    private typeToSchema(type: string, prefix?: string): JsonSchema
    {
        // Handle scalar types
        switch (type)
        {
            case 'double':
            case 'float':
                return { type: 'number' };
            case 'int32':
            case 'int64':
            case 'uint32':
            case 'uint64':
            case 'sint32':
            case 'sint64':
            case 'fixed32':
            case 'fixed64':
            case 'sfixed32':
            case 'sfixed64':
                const schema: JsonSchema = { type: 'integer' };
                if (type.startsWith('u'))
                {
                    schema.minimum = 0;
                }
                return schema;
            case 'bool':
                return { type: 'boolean' };
            case 'string':
                return { type: 'string' };
            case 'bytes':
                return { type: 'string', format: 'byte' };
        }

        // Handle map types
        const mapMatch = type.match(/^map<([^,]+),\s*(.+)>$/);
        if (mapMatch)
        {
            const [, , valueType] = mapMatch;
            const valueSchema = this.typeToSchema(valueType, prefix);

            return {
                type: 'object',
                patternProperties: {
                    '.*': valueSchema
                },
                additionalProperties: false
            };
        }

        // Handle custom types - search in most specific to least specific order
        const searchTypes = [];
        if (prefix)
        {
            const prefixes = prefix.split('.').map((v, i, prefixes) => prefixes.slice(0, i + 1).join('.')).sort((a, b) => b.length - a.length);
            for (const prefix of prefixes)
            {
                searchTypes.push(`${prefix}.${type}`);
            }
        }

        searchTypes.push(type); // Exact match from current scope

        // console.log(`Searching for type '${type}' with prefix '${prefix}':`, searchTypes);
        for (const searchType of searchTypes)
        {
            // console.log(`  Checking if '${searchType}' exists:`, !!this.definitions[searchType]);
            if (this.collectedTypes.has(searchType))
            {
                return { $ref: `#/$defs/${searchType}` };
            }
        }

        // console.log('No definition found, returning empty object');
        // Unknown type - treat as any
        return {};
    }

    private enumToSchema(enumDef: EnumDefinition): JsonSchema
    {
        return {
            type: 'integer',
            enum: Object.values(enumDef.values)
        };
    }
}
