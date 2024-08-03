import { plugin as akala } from '@akala/vite';
import { GenericConfiguration, Configurations, Metadata, Processors, StructuredParameters } from '@akala/commands';
import { Binding, ErrorWithStatus, ObservableObject, Parser, each, eachAsync } from '@akala/core';
import { validateSessionOwner } from '@akala/authentication'

const connectionMap: Record<string, { sessionId: string, sessionSignature: string }> = {}

export default {
    build: {
        // generate .vite/manifest.json in outDir
        manifest: true,
    },
    plugins: [
        akala({
            auth: {
                path: '@akala/authentication/commands.json',
                init: ['file', null, 'my-very-secret-key']
            }
        }, [{
            priority: 0, processor: new Processors.AuthHandler(async (container, command, params) =>
            {
                console.log(command.name);
                // if (!params.auth && command.config.auth?.required)
                //     throw new ErrorWithStatus(403, 'User is not authorized');


                // console.log(connectionId, authConfig, command, params);
                // console.log(command.config);
                let trigger = params._trigger;
                if (!trigger || !command.config[params._trigger])
                    trigger = '';
                if (command.config[trigger] && command.config[trigger].inject)
                {
                    const parser = new Parser();
                    each((command.config[trigger] as GenericConfiguration).inject, (param, i) =>
                    {
                        // console.log(param, i);
                        if (param === 'auth')
                            params.auth = params.param[i];
                        if (param.startsWith('auth.'))
                        {
                            if (!params.auth)
                                params.auth = {}
                            // console.log(params.param)
                            ObservableObject.setValue(params, parser.parse(param), params.param[i]);
                        }
                    });
                    if (command.config.auth?.required)
                    {
                        if (typeof params.connectionId == 'string')
                            connectionMap[params.connectionId] = params.auth as any;

                    }
                }
                // console.log(params);
            })
        }])
    ],
} as import('vite').UserConfig