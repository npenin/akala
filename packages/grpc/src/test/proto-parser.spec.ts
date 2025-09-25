import { describe, test } from 'node:test';
import assert from 'node:assert';
import { ProtoParser, ProtoToJSONSchemaConverter } from '../grpc-proto-parser.js';

describe('Proto Parser', () =>
{
    let terraformProto: string;

    test.before(async () =>
    {
        terraformProto = await fetch('https://raw.githubusercontent.com/hashicorp/terraform-plugin-go/main/tfprotov6/internal/tfplugin6/tfplugin6.proto')
            .then(res => res.text())
            .then(text => text.replace(/[^\x20-\x7E\n\r\t]/g, ''));
    });

    describe('Terraform Proto Parsing', () =>
    {
        test('should parse Terraform proto structure', async () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(terraformProto);

            // Basic structure
            assert.strictEqual(ast.syntax, 'proto3');
            assert.strictEqual(ast.package, 'tfplugin6');
            assert.ok(ast.imports.includes('google/protobuf/timestamp.proto'));

            // Find and test DynamicValue message
            const dynamicValue = findMessage(ast);
            assert.ok(dynamicValue, 'DynamicValue message not found');
            assert.strictEqual(dynamicValue.fields.length, 2);
            assert.deepStrictEqual(dynamicValue.fields[0], {
                name: 'msgpack',
                type: 'bytes',
                tag: 1,
                repeated: false,
                optional: false,
                deprecated: false
            });

            // Find Provider service
            const provider = ast.services.find(s => s.name === 'Provider');
            assert.ok(provider, 'Provider service not found');
            assert.ok(provider.methods.length > 0, 'Provider service has no methods');

            // Test specific service methods
            const getSchema = provider.methods.find(m => m.name === 'GetProviderSchema');
            assert.ok(getSchema, 'GetProviderSchema method not found');
            assert.strictEqual(getSchema.clientStreaming, false);
            assert.strictEqual(getSchema.serverStreaming, false);
        });

        // Helper function to find messages in the AST
        function findMessage(ast: any): any
        {
            for (const msg of ast.messages)
            {
                if (msg.name === 'DynamicValue') return msg;
                if (msg.nested?.messages)
                {
                    for (const nested of msg.nested.messages)
                    {
                        if (nested.name === 'DynamicValue') return nested;
                    }
                }
            }
            return null;
        }
    });

    describe('Basic Parsing', () =>
    {
        test('should parse syntax and package', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                package test;
            `);
            assert.strictEqual(ast.syntax, 'proto3');
            assert.strictEqual(ast.package, 'test');
        });

        test('should parse imports', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                import "google/protobuf/timestamp.proto";
            `);
            assert.deepStrictEqual(ast.imports, ['google/protobuf/timestamp.proto']);
        });
    });

    describe('Message Parsing', () =>
    {
        test('should parse simple message', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                message Test {
                    string name = 1;
                    int32 age = 2;
                }
            `);

            assert.strictEqual(ast.messages.length, 1);
            const msg = ast.messages[0];
            assert.strictEqual(msg.name, 'Test');
            assert.strictEqual(msg.fields.length, 2);

            assert.deepStrictEqual(msg.fields[0], {
                name: 'name',
                type: 'string',
                tag: 1,
                repeated: false,
                optional: false,
                deprecated: false
            });
        });

        test('should parse message with repeated field', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                message Test {
                    repeated string items = 1;
                }
            `);

            const field = ast.messages[0].fields[0];
            assert.strictEqual(field.repeated, true);
        });

        test('should parse message with optional field', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                message Test {
                    optional string maybe = 1;
                }
            `);

            const field = ast.messages[0].fields[0];
            assert.strictEqual(field.optional, true);
        });

        test('should parse message with reserved fields', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                message Test {
                    reserved 8;
                    reserved 15 to 25;
                    string name = 1;
                }
            `);

            const message = ast.messages[0];
            assert.deepStrictEqual(message.reserved, [8, ...Array.from({ length: 11 }, (_, i) => i + 15)]);
            assert.strictEqual(message.fields.length, 1);
        });
    });

    describe('Service Parsing', () =>
    {
        test('should parse simple service', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                service Test {
                    rpc Method (Input) returns (Output);
                }
                message Input {}
                message Output {}
            `);

            assert.strictEqual(ast.services.length, 1);
            const service = ast.services[0];
            assert.strictEqual(service.name, 'Test');
            assert.strictEqual(service.methods.length, 1);
            assert.strictEqual(service.methods[0].name, 'Method');
            assert.strictEqual(service.methods[0].inputType, 'Input');
            assert.strictEqual(service.methods[0].outputType, 'Output');
        });

        test('should parse streaming methods', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                service Test {
                    rpc ClientStream (stream Input) returns (Output);
                    rpc ServerStream (Input) returns (stream Output);
                    rpc BiStream (stream Input) returns (stream Output);
                }
                message Input {}
                message Output {}
            `);

            const service = ast.services[0];
            assert.strictEqual(service.methods.length, 3);

            const [clientStream, serverStream, biStream] = service.methods;

            assert.strictEqual(clientStream.clientStreaming, true);
            assert.strictEqual(clientStream.serverStreaming, false);

            assert.strictEqual(serverStream.clientStreaming, false);
            assert.strictEqual(serverStream.serverStreaming, true);

            assert.strictEqual(biStream.clientStreaming, true);
            assert.strictEqual(biStream.serverStreaming, true);
        });
    });

    describe('Special Types', () =>
    {
        test('should parse oneof fields', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                message Test {
                    oneof test_oneof {
                        string name = 1;
                        int32 number = 2;
                    }
                }
            `);

            const message = ast.messages[0];
            assert.strictEqual(message.oneofs.length, 1);
            const oneof = message.oneofs[0];
            assert.strictEqual(oneof.name, 'test_oneof');
            assert.strictEqual(oneof.fields.length, 2);
            assert.strictEqual(oneof.fields[0].name, 'name');
            assert.strictEqual(oneof.fields[1].name, 'number');
        });

        test('should parse map fields', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                message Test {
                    map<string, int32> counts = 1;
                }
            `);

            const message = ast.messages[0];
            const field = message.fields[0];
            assert.strictEqual(field.type, 'map<string, int32>');
        });

        test('should parse deprecated fields', () =>
        {
            const parser = new ProtoParser();
            const ast = parser.parse(`
                syntax = "proto3";
                message Test {
                    string old_field = 1 [deprecated = true];
                }
            `);

            const field = ast.messages[0].fields[0];
            assert.strictEqual(field.deprecated, true);
        });
    });

    describe('Proto to JSON Schema Conversion', () =>
    {
        test('should convert simple message to schema', () =>
        {
            const parser = new ProtoParser();
            const converter = new ProtoToJSONSchemaConverter();

            const ast = parser.parse(`
                syntax = "proto3";
                package example;
                message Test {
                    string name = 1;
                    int32 age = 2;
                    repeated string items = 3;
                    optional bool active = 4;
                }
                enum Status {
                    UNKNOWN = 0;
                    ACTIVE = 1;
                    INACTIVE = 2;
                }
            `);

            const schema = converter.convert(ast);

            assert.strictEqual(schema.$schema, 'https://json-schema.org/draft-07/schema#');
            assert.strictEqual(schema.type, 'object');
            assert.ok(schema.definitions);

            // Test message schema
            const testMessage = schema.definitions!['Test'];
            assert.strictEqual(testMessage.type, 'object');
            assert.deepStrictEqual(testMessage.required, ['name', 'age', 'items']);
            assert.deepStrictEqual(Object.keys(testMessage.properties!), ['name', 'age', 'items', 'active']);

            // Test string field
            assert.deepStrictEqual(testMessage.properties!['name'], { type: 'string' });

            // Test integer field
            assert.deepStrictEqual(testMessage.properties!['age'], { type: 'integer' });

            // Test repeated field (array)
            assert.deepStrictEqual(testMessage.properties!['items'], {
                type: 'array',
                items: { type: 'string' }
            });

            // Test optional field (not in required)
            assert.deepStrictEqual(testMessage.properties!['active'], { type: 'boolean' });

            // Test enum schema
            const statusEnum = schema.definitions!['Status'];
            assert.strictEqual(statusEnum.type, 'integer');
            assert.deepStrictEqual(statusEnum.enum, [0, 1, 2]);
        });

        test('should handle nested messages and enums', () =>
        {
            const parser = new ProtoParser();
            const converter = new ProtoToJSONSchemaConverter();

            const ast = parser.parse(`
                syntax = "proto3";
                message Person {
                    message Address {
                        string street = 1;
                        string city = 2;
                    }
                    string name = 1;
                    Address address = 2;
                    enum Gender {
                        MALE = 0;
                        FEMALE = 1;
                    }
                    Gender gender = 3;
                }
            `);

            const schema = converter.convert(ast);

            // Test nested message definition
            const addressDef = schema.definitions!['Person.Address'];
            assert.ok(addressDef);
            assert.strictEqual(addressDef.type, 'object');
            assert.deepStrictEqual(addressDef.required, ['street', 'city']);

            // Test that nested message reference works
            const personDef = schema.definitions!['Person'];
            console.log('Person def properties:', JSON.stringify(personDef.properties, null, 2));
            console.log('Available definitions:', Object.keys(schema.definitions));
            assert.deepStrictEqual(personDef.properties!['address'], { $ref: '#/definitions/Person.Address' });

            // Test nested enum
            const genderEnum = schema.definitions!['Person.Gender'];
            assert.ok(genderEnum);
            assert.deepStrictEqual(genderEnum.enum, [0, 1]);
        });

        test('should handle oneof fields', () =>
        {
            const parser = new ProtoParser();
            const converter = new ProtoToJSONSchemaConverter();

            const ast = parser.parse(`
                syntax = "proto3";
                message Test {
                    string id = 1;
                    oneof value {
                        string name = 2;
                        int32 number = 3;
                    }
                }
            `);

            const schema = converter.convert(ast);
            const testDef = schema.definitions!['Test'];

            const oneofSchema = testDef.properties!['value'];
            assert.ok(oneofSchema.oneOf);
            assert.strictEqual(oneofSchema.oneOf.length, 2);

            // First variant (name)
            const nameVariant = oneofSchema.oneOf[0];
            assert.deepStrictEqual(nameVariant.properties!['name'], { type: 'string' });
            assert.deepStrictEqual(nameVariant.required, ['name']);

            // Second variant (number)
            const numberVariant = oneofSchema.oneOf[1];
            assert.deepStrictEqual(numberVariant.properties!['number'], { type: 'integer' });
            assert.deepStrictEqual(numberVariant.required, ['number']);
        });

        test('should handle map types', () =>
        {
            const parser = new ProtoParser();
            const converter = new ProtoToJSONSchemaConverter();

            const ast = parser.parse(`
                syntax = "proto3";
                message Test {
                    map<string, int32> scores = 1;
                }
            `);

            const schema = converter.convert(ast);
            const testDef = schema.definitions!['Test'];

            const mapField = testDef.properties!['scores'];
            assert.strictEqual(mapField.type, 'object');
            assert.ok(mapField.patternProperties);
            assert.deepStrictEqual(mapField.patternProperties['.*'], { type: 'integer' });
            assert.strictEqual(mapField.additionalProperties, false);
        });
    });
});
