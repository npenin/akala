import { MessageDefinition, ProtoAST, ProtoParser } from '../grpc-proto-parser.js';
import { Metadata } from '@akala/commands';
import { openFile, OpenFlags } from '@akala/fs';
import { GrpcMessageDefinition } from '../index.js';

export default async function generateContainerFromProto(file: string | URL)
{
    const parser = new ProtoParser();
    const ast = parser.parse((await (await openFile(file, OpenFlags.Read)).readFile('utf-8')));

    return JSON.stringify(generateContainer(ast), null, 4);
}

export function generateContainer(ast: ProtoAST): Metadata.Container
{
    const commands: Metadata.Command[] = [];
    const messages: { [key: string]: GrpcMessageDefinition } = {};

    // Collect all messages from the AST
    function collectMessages(msgs: MessageDefinition[], prefix = '')
    {
        for (const msg of msgs)
        {
            const fullName = prefix ? `${prefix}.${msg.name}` : msg.name;
            messages[fullName] = msg.fields.map(f =>
            {
                if (f.type == 'reserved')
                    if (f.name)
                        return [f.type, f.name]
                    else
                        return f.type;
                if (f.optional)
                    if (f.name)
                        return [f.type + '?', f.name]
                    else
                        return f.type + '?';
                if (f.repeated)
                    if (f.name)
                        return [f.type + '*', f.name]
                    else
                        return f.type + '*';

                if (f.name)
                    return [f.type, f.name]
                else
                    return f.type;
            });
            if (msg.nested?.messages)
            {
                collectMessages(msg.nested.messages, fullName);
            }
        }
    }

    collectMessages(ast.messages);

    // Tree shaking helper
    function getMessageRefs(type: string, messages: { [key: string]: any[] }): string[]
    {
        if (!type) return [];
        if (type.endsWith('*') || type.endsWith('?'))
        {
            return getMessageRefs(type.slice(0, type.length - 1), messages);
        } else if (type.startsWith('map<'))
        {
            const match = type.match(/^map<([^,]*),\s*(.*)>$/);
            if (match)
            {
                return getMessageRefs(match[1], messages).concat(getMessageRefs(match[2].slice(0, -1), messages));
            }
            return [];
        } else
        {
            if (messages[type])
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
                            const refs = getMessageRefs(typeof field == 'string' ? field : field[0], messages);
                            for (const ref of refs)
                            {
                                if (!methodUsedMessages.has(ref))
                                {
                                    methodUsedMessages.add(ref);
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }

            const methodMessages: { [key: string]: GrpcMessageDefinition } = {};
            for (const key in messages)
            {
                if (methodUsedMessages.has(key))
                {
                    methodMessages[key] = messages[key];
                }
            }

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
                    grpc: {
                        inject: ["request"], // Add inject dependencies if needed
                        method: method.name,
                        request: method.inputType,
                        response: method.outputType,
                        streaming: streaming,
                        messages: methodMessages
                    },
                    doc: {
                        description: `gRPC method ${method.name} from service ${service.name}`,
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
