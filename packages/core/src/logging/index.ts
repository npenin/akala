import { configureLogging, EasyLogConfig, LogLevels } from './shared.js';

export * from './index.browser.js'
export * from './async/stream.js'


const logConfig: EasyLogConfig = {};
let maxLogLevel: LogLevels = LogLevels.error;
if (process.env.NODE_ENV !== 'production')
    maxLogLevel = LogLevels.warn;

if (process.env.DEBUG)
{
    process.env.DEBUG.split(',').forEach(v =>
    {
        if (v === '*')
        {
            maxLogLevel = LogLevels.silly;
        }
        const namespaceLogLevel = Object.keys(LogLevels).find(k => v.endsWith('=' + k));
        if (namespaceLogLevel)
        {
            namespaceLogLevel.split(':').reduce((logConfig, namespace, i, array) =>
            {
                if (i == array.length - 1)
                    logConfig[namespace] = LogLevels[namespaceLogLevel];
                else
                    return logConfig[namespace] ??= {};
            }, logConfig)
        }
    })

    configureLogging({ defaultLevel: maxLogLevel, namespaceConfig: logConfig });
}
