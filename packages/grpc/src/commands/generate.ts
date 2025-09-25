import { EnumDefinition, MessageDefinition, ProtoAST, ProtoParser } from '../grpc-proto-parser.js';
import { ProtoToJsonSchemaConverter } from '../proto-to-json-schema-converter.js';
import { Metadata } from '@akala/commands';
import { readFile } from '@akala/fs';
import { GrpcMessageDefinition } from '../index.js';

export default async function generateContainerFromProto(file: string | URL)
{
    const parser = new ProtoParser();
    const ast = parser.parse((await readFile(file, 'utf-8')));

    return JSON.stringify(generateContainer(ast), null, 4);
}

export function generateContainer(ast: ProtoAST): Metadata.Container
{
    const commands: Metadata.Command[] = [];
    const messages: { [key: string]: GrpcMessageDefinition } = {};
    const enums: { [key: string]: string[] } = {};

    // Collect all messages from the AST
    function collectMessages(msgs: MessageDefinition[], prefix: string = '')
    {
        for (const msg of msgs)
        {
            const fullName = prefix ? `${prefix}.${msg.name}` : msg.name;
            messages[fullName] = msg.fields.map(f =>
            {
                if (f.type == 'reserved')
                    if (f.name)
                        return [f.tag, [f.type, f.name]] as const
                    else
                        return [f.tag, f.type] as const;
                if (msg.nested?.enums?.find(e => e.name == f.type) || msg.nested?.messages?.find(e => e.name == f.type || f.type.startsWith(e.name + '.')))
                    f.type = msg.name + '.' + f.type;
                if (f.optional)
                    if (f.name)
                        return [f.tag, [f.type + '?', f.name]] as const
                    else
                        return [f.tag, f.type + '?'] as const;
                if (f.repeated)
                    if (f.name)
                        return [f.tag, [f.type + '*', f.name]] as const
                    else
                        return [f.tag, f.type + '*'] as const;

                if (f.name)
                    return [f.tag, [f.type, f.name]] as const
                else
                    return [f.tag, f.type] as const;
            }).concat(msg.oneofs?.flatMap(oneof => oneof.fields.map(f =>
            {
                if (f.type == 'reserved')
                    if (f.name)
                        return [f.tag, [f.type, f.name]] as const
                    else
                        return [f.tag, f.type] as const;
                if (msg.nested?.enums?.find(e => e.name == f.type) || msg.nested?.messages?.find(e => e.name == f.type || f.type.startsWith(e.name + '.')))
                    f.type = msg.name + '.' + f.type;

                if (f.optional)
                    if (f.name)
                        return [f.tag, [f.type + '?', f.name]] as const
                    else
                        return [f.tag, f.type + '?'] as const;
                if (f.repeated)
                    if (f.name)
                        return [f.tag, [f.type + '*', f.name]] as const
                    else
                        return [f.tag, f.type + '*'] as const;

                if (f.name)
                    return [f.tag, [f.type, f.name]] as const
                else
                    return [f.tag, f.type] as const;
            }))).sort((a, b) => a[0] - b[0]).map(x => x[1]);
            if (msg.nested?.messages?.length)
            {
                collectMessages(msg.nested.messages, fullName);
            }
            if (msg.nested?.enums?.length)
            {
                collectEnums(msg.nested.enums, fullName);
            }
        }
    }

    function collectEnums(enms: EnumDefinition[], prefix: string = '')
    {
        for (const e of enms)
        {
            const fullName = prefix ? `${prefix}.${e.name}` : e.name;
            enums[fullName] = Object.entries(e.values).sort((a, b) => a[1] - b[1]).map(x => x[0]);
        }
    }

    collectMessages(ast.messages);
    collectEnums(ast.enums);

    // Tree shaking helper
    function getMessageRefs(type: string, optionalPrefix: string): string[]
    {
        if (!type) return [];
        if (type.endsWith('*') || type.endsWith('?'))
            type = type.slice(0, type.length - 1);

        if (type.startsWith('map<'))
        {
            const match = type.match(/^map<([^,]*),\s*(.*)>$/);
            if (match)
            {
                return getMessageRefs(match[1], optionalPrefix).concat(getMessageRefs(match[2], optionalPrefix));
            }
            return [];
        } else
        {
            const prefixes = optionalPrefix.split('.').map((x, i, self) => self.slice(0, i + 1).join('.')).sort((a, b) => b.length - a.length);
            for (const prefix of prefixes)
                if (messages[prefix + '.' + type])
                    return [prefix + '.' + type];
            if (messages[type])
            {
                return [type];
            }
            return [];
        }
    }

    // Tree shaking helper
    function getEnumRefs(type: string, optionalPrefix: string): string[]
    {
        if (!type) return [];
        if (type.endsWith('*') || type.endsWith('?'))
            type = type.slice(0, type.length - 1);

        if (type.startsWith('map<'))
        {
            const match = type.match(/^map<([^,]*),\s*(.*)>$/);
            if (match)
            {
                return getEnumRefs(match[1], optionalPrefix).concat(getEnumRefs(match[2], optionalPrefix));
            }
            return [];
        } else
        {
            const prefixes = optionalPrefix.split('.').map((x, i, self) => self.slice(0, i + 1).join('.')).sort((a, b) => b.length - a.length);
            for (const prefix of prefixes)
                if (enums[prefix + '.' + type])
                    return [prefix + '.' + type];
            if (enums[type])
            {
                return [type];
            }
            return [];
        }
    }

    for (const service of ast.services)
    {
        for (const method of service.methods)
        {

            // Per-method tree shaking
            const methodUsedMessages = new Set<string>();
            const methodUsedEnums = new Set<string>();
            if (messages[method.inputType]) methodUsedMessages.add(method.inputType);
            if (messages[method.outputType]) methodUsedMessages.add(method.outputType);
            let changed = true;
            while (changed)
            {
                changed = false;
                for (const msgName of methodUsedMessages)
                {
                    if (messages[msgName])
                    {
                        for (const field of messages[msgName])
                        {
                            const messageRefs = getMessageRefs(typeof field == 'string' ? field : field[0], msgName);
                            if (messageRefs?.length)
                                for (const ref of messageRefs)
                                {
                                    if (!methodUsedMessages.has(ref))
                                    {
                                        methodUsedMessages.add(ref);
                                        changed = true;
                                    }
                                }
                            else
                            {
                                const enumRefs = getEnumRefs(typeof field == 'string' ? field : field[0], msgName);
                                if (enumRefs?.length)
                                {
                                    for (const ref of enumRefs)
                                    {
                                        if (!methodUsedEnums.has(ref))
                                        {
                                            methodUsedEnums.add(ref);
                                            changed = true;
                                        }
                                    }
                                }
                            }
                        }
                        // Also add all nested messages of this message
                        for (const nestedKey in messages)
                        {
                            if (nestedKey.startsWith(msgName + '.') && !methodUsedMessages.has(nestedKey))
                            {
                                methodUsedMessages.add(nestedKey);
                                changed = true;
                            }

                            if (nestedKey.startsWith(msgName + '.') && !methodUsedEnums.has(nestedKey))
                            {
                                methodUsedEnums.add(nestedKey);
                                changed = true;
                            }
                        }
                    }
                }
            }

            const schema = new ProtoToJsonSchemaConverter().convert(ast);

            const methodMessages: { [key: string]: GrpcMessageDefinition } = {};
            const methodEnums: { [key: string]: string[] } = {};
            for (const key in messages)
            {
                if (methodUsedMessages.has(key))
                {
                    methodMessages[key] = messages[key];
                }
                if (methodUsedEnums.has(key))
                {
                    methodEnums[key] = enums[key];
                }
            }
            for (const key in enums)
            {
                if (methodUsedEnums.has(key))
                {
                    methodEnums[key] = enums[key];
                }
            }

            const methodSchema = { $defs: Object.fromEntries(Object.entries(schema && schema.$defs).filter(([key]) => methodUsedMessages.has(key) || methodUsedEnums.has(key))) };

            let streaming: { type: 'bidirectional' | 'client' | 'server'; message: string } | undefined;
            if (method.clientStreaming && method.serverStreaming)
            {
                streaming = { type: 'bidirectional', message: method.outputType };
            }
            else if (method.clientStreaming)
            {
                streaming = { type: 'client', message: method.inputType };
            }
            else if (method.serverStreaming)
            {
                streaming = { type: 'server', message: method.outputType };
            }

            commands.push({
                name: ast.services.length == 1 ? method.name : `${service.name}.${method.name}`,
                config: {
                    "": { inject: ["param.0"] },
                    grpc: {
                        inject: ["request"], // Add inject dependencies if needed
                        method: method.name,
                        request: method.inputType,
                        response: method.outputType,
                        streaming: streaming,
                        messages: methodMessages,
                        enums: methodEnums,
                    },
                    schema: {
                        $defs: methodSchema.$defs,
                        inject: [{ $ref: '#/$defs/' + method.inputType }],
                        resultSchema: { $ref: '#/$defs/' + method.outputType },
                    },
                    doc: {
                        description: `gRPC method ${method.name} from service ${service.name}`,
                        inject: ["request"],
                        options: {
                            "request": `The ${method.name} request`
                        }
                        // Add more documentation details if needed
                    }
                }
            });
        }
    }

    return {
        name: ast.package || 'default',
        commands: commands,
        // Add other container fields as needed: stateless, extends, dependencies, $defs
    };
}
