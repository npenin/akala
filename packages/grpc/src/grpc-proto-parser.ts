import { StringCursor } from '@akala/core';

export interface JSONSchema
{
    $schema?: string;
    type?: string;
    properties?: { [key: string]: JSONSchema };
    required?: string[];
    items?: JSONSchema;
    oneOf?: JSONSchema[];
    enum?: (string | number)[];
    $ref?: string;
    additionalProperties?: boolean | JSONSchema;
    pattern?: string;
    format?: string;
    minimum?: number;
    maximum?: number;
    [key: string]: any;
}

export interface ProtoAST
{
    syntax: string;
    package?: string;
    imports: string[];
    messages: MessageDefinition[];
    services: ServiceDefinition[];
    enums: EnumDefinition[];
}

export interface OneofDefinition
{
    name: string;
    fields: FieldDefinition[];
}

export interface MessageDefinition
{
    name: string;
    fields: FieldDefinition[];
    oneofs: OneofDefinition[];
    reserved: number[];
    nested?: {
        messages: MessageDefinition[];
        enums: EnumDefinition[];
    };
}

export interface FieldDefinition
{
    name: string;
    type: string;
    tag: number;
    repeated: boolean;
    optional: boolean;
    deprecated: boolean;
}

export interface ServiceDefinition
{
    name: string;
    methods: MethodDefinition[];
}

export interface MethodDefinition
{
    name: string;
    inputType: string;
    outputType: string;
    clientStreaming: boolean;
    serverStreaming: boolean;
}

export interface EnumDefinition
{
    name: string;
    values: { [key: string]: number };
}

export class ProtoParser
{
    constructor()
    {
    }

    private skipComments(cursor: StringCursor): void
    {
        cursor.skipWhitespace();

        while (!cursor.eof)
        {
            if (cursor.char !== '/')
            {
                break;
            }

            const nextChar = cursor.string[cursor.offset + 1];
            if (!nextChar)
            {
                break;
            }

            if (nextChar === '/')
            {
                // Single line comment
                cursor.offset += 2;
                while (!cursor.eof && !cursor.exec(/\n/))
                {
                    cursor.offset++;
                }
                cursor.skipWhitespace();
                continue;
            }

            if (nextChar === '*')
            {
                // Multi line comment
                cursor.offset += 2;
                while (!cursor.eof && !(cursor.string[cursor.offset] === '*' && cursor.string[cursor.offset + 1] === '/'))
                {
                    cursor.offset++;
                }
                if (!cursor.eof)
                {
                    cursor.offset += 2;
                }
                cursor.skipWhitespace();
                continue;
            }

            break;
        }
    }

    parse(content: string): ProtoAST
    {
        const cursor = new StringCursor(content);
        const ast: ProtoAST = {
            syntax: 'proto3',
            imports: [],
            messages: [],
            services: [],
            enums: []
        };

        while (!cursor.eof)
        {
            this.skipComments(cursor);

            if (cursor.exec(/syntax/))
            {
                ast.syntax = this.parseSyntax(cursor);
            } else if (cursor.exec(/option\s+/))
            {
                // Skip option name and value until semicolon
                while (!cursor.eof && cursor.char !== ';')
                {
                    cursor.offset++;
                }
                cursor.read(';');
            } else if (cursor.exec(/package/))
            {
                ast.package = this.parsePackage(cursor);
            } else if (cursor.exec(/import/))
            {
                ast.imports.push(this.parseImport(cursor));
            } else if (cursor.exec(/message/))
            {
                ast.messages.push(this.parseMessage(cursor));
            } else if (cursor.exec(/service/))
            {
                ast.services.push(this.parseService(cursor));
            } else if (cursor.exec(/enum/))
            {
                ast.enums.push(this.parseEnum(cursor));
            } else if (cursor.eof)
            {
                break;
            } else if (/\s/.test(cursor.char))
            {
                cursor.skipWhitespace();
            } else
            {
                throw new Error(`invalid char ${cursor.char} at ${cursor.getReadableOffset()}`)
            }
        }

        return ast;
    }

    private parseOneof(cursor: StringCursor): OneofDefinition
    {
        const oneof: OneofDefinition = {
            name: '',
            fields: []
        };

        this.skipComments(cursor);
        oneof.name = this.parseIdentifier(cursor);
        this.skipComments(cursor);
        cursor.read('{');
        this.skipComments(cursor);

        while (cursor.char !== '}')
        {
            this.skipComments(cursor);
            oneof.fields.push(this.parseField(cursor));
            this.skipComments(cursor);
        }

        cursor.read('}');
        return oneof;
    }

    private parseMessage(cursor: StringCursor): MessageDefinition
    {
        const message: MessageDefinition = {
            name: '',
            fields: [],
            oneofs: [],
            reserved: [],
            nested: {
                messages: [],
                enums: []
            }
        };

        this.skipComments(cursor);
        message.name = this.parseIdentifier(cursor);
        this.skipComments(cursor);
        cursor.read('{');
        this.skipComments(cursor);

        while (!cursor.eof && cursor.char !== '}')
        {
            this.skipComments(cursor);

            if (cursor.exec(/message/))
            {
                message.nested!.messages.push(this.parseMessage(cursor));
            } else if (cursor.exec(/enum/))
            {
                message.nested!.enums.push(this.parseEnum(cursor));
            } else if (cursor.exec(/oneof/))
            {
                message.oneofs.push(this.parseOneof(cursor));
            } else if (cursor.exec(/reserved/))
            {
                this.skipComments(cursor);
                const numMatch = cursor.exec(/0x[0-9a-fA-F]+|[0-9]+/);
                if (!numMatch)
                {
                    throw new Error(`Expected number after reserved at ${cursor.getReadableOffset()}`);
                }
                const start = parseInt(numMatch[0], numMatch[0].startsWith('0x') ? 16 : 10);
                this.skipComments(cursor);

                if (cursor.exec(/to/))
                {
                    // Range of reserved numbers
                    this.skipComments(cursor);
                    const endMatch = cursor.exec(/0x[0-9a-fA-F]+|[0-9]+/);
                    if (!endMatch)
                    {
                        throw new Error(`Expected end number after 'to' at ${cursor.getReadableOffset()}`);
                    }
                    const end = parseInt(endMatch[0], endMatch[0].startsWith('0x') ? 16 : 10);
                    for (let i = start; i <= end; i++)
                    {
                        message.reserved.push(i);
                    }
                } else
                {
                    // Single reserved number
                    message.reserved.push(start);
                }

                this.skipComments(cursor);
                cursor.read(';');
            } else
            {
                message.fields.push(this.parseField(cursor));
            }
            this.skipComments(cursor);
        }

        cursor.read('}');
        return message;
    }

    private parseField(cursor: StringCursor): FieldDefinition & { deprecated?: boolean }
    {
        const field: FieldDefinition & { deprecated?: boolean } = {
            name: '',
            type: '',
            tag: 0,
            repeated: false,
            optional: false,
            deprecated: false
        };

        this.skipComments(cursor);

        const keywords = ['repeated', 'optional'];
        let token = this.parseIdentifier(cursor);

        while (keywords.includes(token))
        {
            if (token === 'repeated') field.repeated = true;
            else if (token === 'optional') field.optional = true;

            this.skipComments(cursor);
            token = this.parseIdentifier(cursor);
        }

        // Handle map types: map<key_type, value_type>
        if (token === 'map')
        {
            this.skipComments(cursor);
            if (!cursor.read('<'))
            {
                throw new Error(`Expected < after map at ${cursor.getReadableOffset()}`);
            }
            this.skipComments(cursor);
            const keyType = this.parseIdentifier(cursor);
            this.skipComments(cursor);
            if (!cursor.read(','))
            {
                throw new Error(`Expected , in map type at ${cursor.getReadableOffset()}`);
            }
            this.skipComments(cursor);
            const valueType = this.parseIdentifier(cursor);
            this.skipComments(cursor);
            if (!cursor.read('>'))
            {
                throw new Error(`Expected > in map type at ${cursor.getReadableOffset()}`);
            }
            field.type = `map<${keyType}, ${valueType}>`;
        } else
        {
            field.type = token;
        }

        this.skipComments(cursor);
        field.name = this.parseIdentifier(cursor);
        this.skipComments(cursor);
        cursor.trimRead('=');
        this.skipComments(cursor);

        // Match number with optional hex format and whitespace
        const numMatch = cursor.exec(/0x[0-9a-fA-F]+|[0-9]+/);
        if (!numMatch)
        {
            throw new Error(`Expected number at ${cursor.getReadableOffset()}`);
        }
        field.tag = parseInt(numMatch[0], numMatch[0].startsWith('0x') ? 16 : 10);

        // Handle options like [deprecated=true]
        this.skipComments(cursor);
        if (cursor.exec(/\[/))
        {
            this.skipComments(cursor);
            while (!cursor.eof && cursor.char !== ']')
            {
                if (cursor.exec(/deprecated\s*=\s*true/))
                {
                    field.deprecated = true;
                }
            }
            cursor.read(']');
            this.skipComments(cursor);
        }

        cursor.read(';');
        this.skipComments(cursor); return field;
    }

    private parseIdentifier(cursor: StringCursor): string
    {
        this.skipComments(cursor);
        const match = cursor.exec(/[a-zA-Z_][\w.]*/);
        if (!match)
        {
            throw new Error(`Expected identifier at ${cursor.getReadableOffset()}`);
        }
        return match[0];
    }

    private parseSyntax(cursor: StringCursor): string
    {
        this.skipComments(cursor);
        cursor.trimRead('=');
        this.skipComments(cursor);
        cursor.read('"');
        const syntax = this.parseIdentifier(cursor);
        cursor.read('"');
        this.skipComments(cursor);
        cursor.read(';');
        this.skipComments(cursor);
        return syntax;
    }

    private parsePackage(cursor: StringCursor): string
    {
        this.skipComments(cursor);
        const pkg = this.parseIdentifier(cursor);
        this.skipComments(cursor);
        cursor.read(';');
        this.skipComments(cursor);
        return pkg;
    }

    private parseImport(cursor: StringCursor): string
    {
        this.skipComments(cursor);
        cursor.read('"');
        const match = cursor.exec(/[a-zA-Z0-9_./\-]+/);
        if (!match)
        {
            throw new Error(`Expected import path at ${cursor.getReadableOffset()}`);
        }
        const importPath = match[0];
        cursor.read('"');
        this.skipComments(cursor);
        cursor.read(';');
        this.skipComments(cursor);
        return importPath;
    }

    private parseService(cursor: StringCursor): ServiceDefinition
    {
        const service: ServiceDefinition = {
            name: '',
            methods: []
        };

        service.name = this.parseIdentifier(cursor);
        this.skipComments(cursor);
        cursor.read('{');
        this.skipComments(cursor);

        while (cursor.char !== '}')
        {
            this.skipComments(cursor);
            if (cursor.exec(/rpc\s+/))
            {
                service.methods.push(this.parseMethod(cursor));
            } else
            {
                // Skip lines that aren't rpc definitions (comments, etc)
                while (cursor.char !== '\n' && cursor.char !== '}' && !cursor.eof)
                {
                    cursor.offset++;
                }
            }
            this.skipComments(cursor);
        }

        cursor.read('}');
        this.skipComments(cursor);
        return service;
    }

    private parseMethod(cursor: StringCursor): MethodDefinition
    {
        const method: MethodDefinition = {
            name: '',
            inputType: '',
            outputType: '',
            clientStreaming: false,
            serverStreaming: false
        };

        this.skipComments(cursor);
        method.name = this.parseIdentifier(cursor);
        this.skipComments(cursor);
        cursor.read('(');
        this.skipComments(cursor);
        if (cursor.exec(/stream/))
        {
            method.clientStreaming = true;
            this.skipComments(cursor);
        }
        method.inputType = this.parseIdentifier(cursor);
        this.skipComments(cursor);
        cursor.read(')');
        this.skipComments(cursor);
        cursor.trimRead('returns');
        this.skipComments(cursor);
        cursor.read('(');
        this.skipComments(cursor);
        if (cursor.exec(/stream/))
        {
            method.serverStreaming = true;
            this.skipComments(cursor);
        }
        method.outputType = this.parseIdentifier(cursor);
        this.skipComments(cursor);
        cursor.read(')');
        this.skipComments(cursor);

        // Skip any options
        while (cursor.char !== ';')
        {
            cursor.offset++;
        }
        cursor.read(';');
        this.skipComments(cursor);

        return method;
    }

    private parseEnum(cursor: StringCursor): EnumDefinition
    {
        const enumDef: EnumDefinition = {
            name: '',
            values: {}
        };

        this.skipComments(cursor);
        enumDef.name = this.parseIdentifier(cursor);
        this.skipComments(cursor);
        cursor.read('{');
        this.skipComments(cursor);

        while (cursor.char !== '}')
        {
            this.skipComments(cursor);
            const name = this.parseIdentifier(cursor);
            this.skipComments(cursor);
            cursor.trimRead('=');
            this.skipComments(cursor);

            const numMatch = cursor.exec(/[0-9]+/);
            if (!numMatch)
            {
                throw new Error(`Expected number at ${cursor.getReadableOffset()}`);
            }
            const value = parseInt(numMatch[0]);

            cursor.read(';');
            this.skipComments(cursor);
            enumDef.values[name] = value;
        }

        cursor.read('}');
        this.skipComments(cursor);
        return enumDef;
    }
}

export class ProtoToJSONSchemaConverter
{
    private definitions: { [key: string]: JSONSchema } = {};

    convert(ast: ProtoAST): JSONSchema
    {
        this.definitions = {};

        // Process all types first to build definitions
        this.processTypes(ast);

        // Create main schema
        const schema: JSONSchema = {
            $schema: 'https://json-schema.org/draft-07/schema#',
            type: 'object',
            properties: {},
            definitions: this.definitions
        };

        if (ast.package)
        {
            schema.title = ast.package;
        }

        return schema;
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

    private messageToSchema(message: MessageDefinition, prefix?: string): JSONSchema
    {
        const schema: JSONSchema = {
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
            const oneofSchema: JSONSchema = {
                type: 'object',
                oneOf: []
            };

            for (const field of oneof.fields)
            {
                const variant: JSONSchema = {
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

    private fieldToSchema(field: FieldDefinition, prefix?: string): JSONSchema
    {
        let schema: JSONSchema = this.typeToSchema(field.type, prefix);

        if (field.repeated)
        {
            schema = {
                type: 'array',
                items: schema
            };
        }

        return schema;
    }

    private typeToSchema(type: string, prefix?: string): JSONSchema
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
                const schema: JSONSchema = { type: 'integer' };
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
        if (prefix && !type.includes('.'))
        {
            searchTypes.push(`${prefix}.${type}`);
        }
        if (type && type.includes('.'))
        {
            searchTypes.push(type); // Full qualified name
        } else if (type)
        {
            searchTypes.push(type); // Exact match from current scope
        }

        console.log(`Searching for type '${type}' with prefix '${prefix}':`, searchTypes);
        for (const searchType of searchTypes)
        {
            console.log(`  Checking if '${searchType}' exists:`, !!this.definitions[searchType]);
            if (this.definitions[searchType])
            {
                return { $ref: `#/definitions/${searchType}` };
            }
        }

        console.log('No definition found, returning empty object');
        // Unknown type - treat as any
        return {};
    }

    private enumToSchema(enumDef: EnumDefinition): JSONSchema
    {
        return {
            type: 'integer',
            enum: Object.values(enumDef.values)
        };
    }
}
