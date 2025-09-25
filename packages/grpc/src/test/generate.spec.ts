import { describe, test } from 'node:test';
import assert from 'node:assert';
import { ProtoParser } from '../grpc-proto-parser.js';
import { generateContainer } from '../commands/generate.js';

describe('Generate Container', () =>
{
    let parser: ProtoParser;

    test.before(() =>
    {
        parser = new ProtoParser();
    });

    describe('Tree Shaking', () =>
    {
        test('should include only input and output types for simple unary method', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc UnaryMethod (Input) returns (Output);
                }
                message Input {
                    string name = 1;
                }
                message Output {
                    int32 result = 1;
                }
                message Unused {
                    string unused = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            assert.strictEqual(container.commands.length, 1);
            const command = container.commands[0];
            assert.strictEqual(command.name, 'UnaryMethod');
            assert.ok(command.config.grpc.messages['Input']);
            assert.ok(command.config.grpc.messages['Output']);
            assert.ok(!command.config.grpc.messages['Unused']);
            assert.ok(command.config.schema.$defs['Input']);
            assert.ok(command.config.schema.$defs['Output']);
            assert.ok(!command.config.schema.$defs['Unused']);
        });

        test('should include referenced types from input fields', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc Method (Request) returns (Response);
                }
                message Request {
                    SubMessage sub = 1;
                    repeated SubMessage subs = 2;
                    optional SubMessage opt = 3;
                    map<string, SubMessage> map = 4;
                }
                message SubMessage {
                    string value = 1;
                }
                message Response {
                    string result = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            const command = container.commands[0];
            assert.ok(command.config.grpc.messages['Request']);
            assert.ok(command.config.grpc.messages['SubMessage']);
            assert.ok(command.config.grpc.messages['Response']);
            assert.ok(command.config.schema.$defs['Request']);
            assert.ok(command.config.schema.$defs['SubMessage']);
            assert.ok(command.config.schema.$defs['Response']);
        });

        test('should include nested messages', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc Method (Wrapper) returns (Response);
                }
                message Wrapper {
                    Nested nested = 1;
                    message Nested {
                        string inner = 1;
                        Deeper deeper = 2;
                        message Deeper {
                            int32 value = 1;
                        }
                    }
                }
                message Response {
                    string ok = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            const command = container.commands[0];
            assert.ok(command.config.grpc.messages['Wrapper']);
            assert.ok(command.config.grpc.messages['Wrapper.Nested']);
            assert.ok(command.config.grpc.messages['Wrapper.Nested.Deeper']);
            assert.ok(command.config.schema.$defs['Wrapper']);
            assert.ok(command.config.schema.$defs['Wrapper.Nested']);
            assert.ok(command.config.schema.$defs['Wrapper.Nested.Deeper']);
        });

        test('should handle multiple levels of nested references', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc Method (Level1) returns (Response);
                }
                message Level1 {
                    Level2 child = 1;
                }
                message Level2 {
                    Level3 grandchild = 1;
                }
                message Level3 {
                    string data = 1;
                }
                message Response {
                    string result = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            const command = container.commands[0];
            assert.ok(command.config.grpc.messages['Level1']);
            assert.ok(command.config.grpc.messages['Level2']);
            assert.ok(command.config.grpc.messages['Level3']);
            assert.ok(command.config.schema.$defs['Level1']);
            assert.ok(command.config.schema.$defs['Level2']);
            assert.ok(command.config.schema.$defs['Level3']);
        });

        test('should handle maps with custom types', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc Method (Request) returns (Response);
                }
                message Request {
                    map<string, CustomType> myMap = 1;
                }
                message CustomType {
                    string value = 1;
                }
                message Response {
                    string ok = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            const command = container.commands[0];
            assert.ok(command.config.grpc.messages['Request']);
            assert.ok(command.config.grpc.messages['CustomType']);
            assert.ok(command.config.schema.$defs['Request']);
            assert.ok(command.config.schema.$defs['CustomType']);
        });

        test('should handle bidirectional streaming', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc Bidirectional (stream Input) returns (stream Output);
                }
                message Input {
                    string data = 1;
                }
                message Output {
                    string result = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            const command = container.commands[0];
            assert.strictEqual(command.name, 'Bidirectional');
            assert.deepStrictEqual(command.config.grpc.streaming, { type: 'bidirectional', message: 'Output' });
            assert.ok(command.config.grpc.messages['Input']);
            assert.ok(command.config.grpc.messages['Output']);
        });

        test('should handle client streaming', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc ClientStream (stream Input) returns (Output);
                }
                message Input {
                    string data = 1;
                }
                message Output {
                    string result = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            const command = container.commands[0];
            assert.strictEqual(command.name, 'ClientStream');
            assert.deepStrictEqual(command.config.grpc.streaming, { type: 'client', message: 'Input' });
            assert.ok(command.config.grpc.messages['Input']);
            assert.ok(command.config.grpc.messages['Output']);
        });

        test('should handle server streaming', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc ServerStream (Input) returns (stream Output);
                }
                message Input {
                    string data = 1;
                }
                message Output {
                    string result = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            const command = container.commands[0];
            assert.strictEqual(command.name, 'ServerStream');
            assert.deepStrictEqual(command.config.grpc.streaming, { type: 'server', message: 'Output' });
            assert.ok(command.config.grpc.messages['Input']);
            assert.ok(command.config.grpc.messages['Output']);
        });

        test('should handle multiple services by prefixing method names', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service ServiceA {
                    rpc Method (Input) returns (Output);
                }
                service ServiceB {
                    rpc Method (Input) returns (Output);
                }
                message Input {
                    string data = 1;
                }
                message Output {
                    string result = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            assert.strictEqual(container.commands.length, 2);
            const commandA = container.commands.find(c => c.name === 'ServiceA.Method');
            const commandB = container.commands.find(c => c.name === 'ServiceB.Method');
            assert.ok(commandA);
            assert.ok(commandB);
            assert.ok(commandA.config.grpc.messages['Input']);
            assert.ok(commandB.config.grpc.messages['Input']);
        });

        test('should include empty messages if referenced as input/output', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc EmptyMethod (Empty) returns (Empty);
                }
                message Empty {}
                message Unused {
                    string unnecessary = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            const command = container.commands[0];
            assert.ok(command.config.grpc.messages['Empty']);
            assert.ok(!command.config.grpc.messages['Unused']);
            assert.ok(command.config.schema.$defs['Empty']);
            assert.ok(!command.config.schema.$defs['Unused']);
        });

        test('should handle oneof fields correctly in tree shaking', () =>
        {
            const proto = `
                syntax = "proto3";
                package test;
                service TestService {
                    rpc Method (Request) returns (Response);
                }
                message Request {
                    oneof one_of {
                        SubTypeA subA = 1;
                        SubTypeB subB = 2;
                    }
                }
                message SubTypeA {
                    string a = 1;
                }
                message SubTypeB {
                    int32 b = 1;
                }
                message Response {
                    string result = 1;
                }
            `;

            const ast = parser.parse(proto);
            const container = generateContainer(ast);

            const command = container.commands[0];
            assert.ok(command.config.grpc.messages['Request']);
            assert.ok(command.config.grpc.messages['SubTypeA']);
            assert.ok(command.config.grpc.messages['SubTypeB']);
            assert.ok(command.config.schema.$defs['Request']);
            assert.ok(command.config.schema.$defs['SubTypeA']);
            assert.ok(command.config.schema.$defs['SubTypeB']);
        });
    });
});
