import { Configuration, Trigger } from "@akala/commands";
import { MessageDefinition, ProtoAST, ProtoToJSONSchemaConverter } from "./grpc-proto-parser.js";
import { HttpStatusCode, IsomorphicBuffer, SocketAdapter } from "@akala/core";
import { protobuf, parsers, Cursor } from "@akala/protocol-parser";
import { ProtobufMessage } from "@akala/protocol-parser/dist/parsers/protobuf/index.js";

export enum GrpcStatusCode
{
    OK = 0,
    CANCELLED = 1,
    UNKNOWN = 2,
    INVALID_ARGUMENT = 3,
    DEADLINE_EXCEEDED = 4,
    NOT_FOUND = 5,
    ALREADY_EXISTS = 6,
    PERMISSION_DENIED = 7,
    RESOURCE_EXHAUSTED = 8,
    FAILED_PRECONDITION = 9,
    ABORTED = 10,
    OUT_OF_RANGE = 11,
    UNIMPLEMENTED = 12,
    INTERNAL = 13,
    UNAVAILABLE = 14,
    DATA_LOSS = 15,
    UNAUTHENTICATED = 16
}

/**
 * A field type can be either a string (for unnamed fields) or a tuple of [type, name]
 */
export type GrpcFieldType = string | [string, string];

/**
 * A message definition is an array of field types
 */
export type GrpcMessageDefinition = GrpcFieldType[];

export interface GrpcConfiguration extends Configuration
{
    inject: string[];
    method: string;
    request: string;
    response: string;
    streaming?: {
        type: 'server' | 'client' | 'bidirectional';
        message: string;
    };
    messages: {
        [key: string]: GrpcMessageDefinition;
    };
}

declare module '@akala/commands'
{
    export interface ConfigurationMap
    {
        grpc?: GrpcConfiguration;
    }
}

function getWireType(type: string, nested: MessageDefinition['nested'], ast: ProtoAST): protobuf.WireType
{
    // Handle scalar types first
    switch (type)
    {
        case 'double':
        case 'float':
            return '32-bit';
        case 'int32':
        case 'uint32':
        case 'sint32':
        case 'fixed32':
        case 'sfixed32':
        case 'bool':
        case 'enum':
            return 'varint';
        case 'int64':
        case 'uint64':
        case 'sint64':
        case 'fixed64':
        case 'sfixed64':
            return '64-bit';
        case 'string':
        case 'bytes':
            return 'length-delimited';
    }

    // Check nested messages and enums
    if (nested)
    {
        if (nested.messages?.some(m => m.name === type))
        {
            return 'length-delimited';
        }
        if (nested.enums?.some(e => e.name === type))
        {
            return 'varint';
        }
    }

    // Look in the root AST
    if (ast.messages.some(m => m.name === type))
    {
        return 'length-delimited';
    }
    if (ast.enums.some(e => e.name === type))
    {
        return 'varint';
    }

    throw new Error(`Unknown type: ${type}`);
}

export { ProtoToJSONSchemaConverter };

export const trigger = new Trigger('grpc', (container, grpc: ProtoAST, socket: SocketAdapter<IsomorphicBuffer>) =>
{
    const messages = Object.fromEntries(grpc.messages.map(m => [m.name, protobuf.object(
        ...m.fields.sort((a, b) => a.tag - b.tag).map(f => protobuf.property<ProtobufMessage<any>, string>(f.name, getWireType(f.type, m.nested, grpc), getParser(f.type, m.nested, grpc))
        ))]));

    const methods = new Map(grpc.services[0].methods.map(method => [method.name, {
        input: messages[method.inputType] || getParser(method.inputType, null, grpc),
        output: messages[method.outputType] || getParser(method.outputType, null, grpc),
        clientStreaming: method.clientStreaming,
        serverStreaming: method.serverStreaming
    }]));

    socket.on('message', async data =>
    {
        // First 4 bytes are message length (uint32)
        const cursor = new Cursor();
        // Skip the message length (4 bytes)
        cursor.offset += 4;

        // Next byte is the method index
        const methodIndex = parsers.uint8.read(data, cursor);

        // Get the method
        const method = grpc.services[0].methods[methodIndex];
        if (!method)
        {
            throw new Error(`Unknown method index: ${methodIndex}`);
        }

        const methodParsers = methods.get(method.name);
        if (!methodParsers)
        {
            throw new Error(`No parsers found for method: ${method.name}`);
        }

        // Parse request message
        const request = methodParsers.input.read(data, cursor);

        try
        {
            // Execute the RPC method
            const result = await container.dispatch(method.name, { request, _trigger: 'grpc' });

            // Construct response
            const responseBuffer = new IsomorphicBuffer(1024); // Initial size, will grow if needed
            const responseCursor = new Cursor();

            // Write success status (0)
            parsers.uint8.write(responseBuffer, responseCursor, 0);

            // Write response message
            methodParsers.output.write(responseBuffer, responseCursor, result);

            // Send response
            const response = new IsomorphicBuffer(responseCursor.offset);
            responseBuffer.copy(response, 0, 0, responseCursor.offset);
            await socket.send(response);
        } catch (error)
        {
            // Construct error response
            const responseBuffer = new IsomorphicBuffer(1024);
            const responseCursor = new Cursor();

            // Map HTTP status codes to gRPC status codes
            let grpcStatus: GrpcStatusCode;
            switch (error.statusCode)
            {
                case HttpStatusCode.OK:
                    grpcStatus = GrpcStatusCode.OK;
                    break;
                case HttpStatusCode.BadRequest:
                    grpcStatus = GrpcStatusCode.INVALID_ARGUMENT;
                    break;
                case HttpStatusCode.GatewayTimeout:
                case HttpStatusCode.RequestTimeout:
                    grpcStatus = GrpcStatusCode.DEADLINE_EXCEEDED;
                    break;
                case HttpStatusCode.NotFound:
                    grpcStatus = GrpcStatusCode.NOT_FOUND;
                    break;
                case HttpStatusCode.Conflict:
                    grpcStatus = GrpcStatusCode.ALREADY_EXISTS;
                    break;
                case HttpStatusCode.Forbidden:
                    grpcStatus = GrpcStatusCode.PERMISSION_DENIED;
                    break;
                case HttpStatusCode.TooManyRequests:
                case HttpStatusCode.PayloadTooLarge:
                    grpcStatus = GrpcStatusCode.RESOURCE_EXHAUSTED;
                    break;
                case HttpStatusCode.PreconditionFailed:
                    grpcStatus = GrpcStatusCode.FAILED_PRECONDITION;
                    break;
                case HttpStatusCode.UnprocessableEntity:
                    grpcStatus = GrpcStatusCode.ABORTED;
                    break;
                case HttpStatusCode.RangeNotSatisfiable:
                    grpcStatus = GrpcStatusCode.OUT_OF_RANGE;
                    break;
                case HttpStatusCode.NotImplemented:
                    grpcStatus = GrpcStatusCode.UNIMPLEMENTED;
                    break;
                case HttpStatusCode.InternalServerError:
                    grpcStatus = GrpcStatusCode.INTERNAL;
                    break;
                case HttpStatusCode.ServiceUnavailable:
                    grpcStatus = GrpcStatusCode.UNAVAILABLE;
                    break;
                case HttpStatusCode.Unauthorized:
                    grpcStatus = GrpcStatusCode.UNAUTHENTICATED;
                    break;
                default:
                    grpcStatus = GrpcStatusCode.UNKNOWN;
                    break;
            }

            // Write gRPC status code
            parsers.uint8.write(responseBuffer, responseCursor, grpcStatus);

            // Write error message
            const errorMessage = error.message || 'Unknown error';
            protobuf.string().write(responseBuffer, responseCursor, errorMessage);

            // Send error response
            const response = new IsomorphicBuffer(responseCursor.offset);
            responseBuffer.copy(response, 0, 0, responseCursor.offset);
            await socket.send(response);
        }
    });
});


function getParser<T>(type: string, nested: MessageDefinition['nested'], ast: ProtoAST): parsers.Parser<T>
{
    // Handle scalar types first
    switch (type)
    {
        case 'double':
        case 'float':
            return protobuf.int32 as unknown as parsers.Parser<T>;
        case 'int32':
        case 'uint32':
        case 'sint32':
        case 'fixed32':
        case 'sfixed32':
        case 'bool':
        case 'enum':
            return protobuf.varint as unknown as parsers.Parser<T>;
        case 'int64':
        case 'uint64':
        case 'sint64':
        case 'fixed64':
        case 'sfixed64':
            return protobuf.int64 as unknown as parsers.Parser<T>;
        case 'string':
            return protobuf.string() as unknown as parsers.Parser<T>;
        case 'bytes':
            return protobuf.raw as unknown as parsers.Parser<T>;
    }

    // Check nested types
    if (nested)
    {
        // Look for nested message
        const nestedMessage = nested.messages?.find(m => m.name === type);
        if (nestedMessage)
        {
            const messageParser = protobuf.object(
                ...nestedMessage.fields.sort((a, b) => a.tag - b.tag).map(f =>
                {
                    const wireType = getWireType(f.type, nestedMessage.nested, ast);
                    const fieldParser = getParser<unknown>(f.type, nestedMessage.nested, ast);
                    return protobuf.property<any, typeof f.name>(f.name, wireType, fieldParser);
                })
            );
            return messageParser as unknown as parsers.Parser<T>;
        }

        // Look for nested enum
        if (nested.enums?.some(e => e.name === type))
        {
            return protobuf.varint as unknown as parsers.Parser<T>;
        }
    }

    // Look in root AST
    const rootMessage = ast.messages.find(m => m.name === type);
    if (rootMessage)
    {
        const messageParser = protobuf.object(
            ...rootMessage.fields.sort((a, b) => a.tag - b.tag).map(f =>
            {
                const wireType = getWireType(f.type, rootMessage.nested, ast);
                const fieldParser = getParser<unknown>(f.type, rootMessage.nested, ast);
                return protobuf.property<any, typeof f.name>(f.name, wireType, fieldParser);
            })
        );
        return messageParser as unknown as parsers.Parser<T>;
    }

    // Look for root enum
    if (ast.enums.some(e => e.name === type))
    {
        return protobuf.varint as unknown as parsers.Parser<T>;
    }

    throw new Error(`Unknown type: ${type}`);
}
