import { plugin as akala } from '@akala/vite';
import { GenericConfiguration, Configurations, Metadata, Processors, StructuredParameters } from '@akala/commands';
import { Binding, ErrorWithStatus, eachAsync } from '@akala/core';
import { comma } from 'postcss/lib/list';

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
            priority: 0, processor: new Processors.AuthHandler(async (connectionId, authConfig: Configurations['auth'][keyof Configurations['auth']], command: Metadata.Command, params: StructuredParameters) =>
            {
                if (!connectionId && command.config.auth?.required)
                    throw new ErrorWithStatus(403, 'User is not authorized');

                // console.log(connectionId, authConfig, command, params);
                // console.log(command.config);
                let trigger = params._trigger;
                if (!trigger || !command.config[params._trigger])
                    trigger = '';
                if (command.config[trigger] && command.config[trigger].inject)
                {
                    await eachAsync((command.config[trigger] as GenericConfiguration).inject, async (param, i) =>
                    {
                        console.log(param, i);
                        if (param === 'auth')
                            params.auth = params.param[i];
                        if (param.startsWith('auth.'))
                        {
                            if (!params.auth)
                                params.auth = {}
                            console.log(params.param)
                            await Binding.getSetter(params, param)(params.param[i]);
                        }
                    });
                }
                console.log(params);
            })
        }])
    ],
} as import('vite').UserConfig