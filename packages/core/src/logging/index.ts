import { configureLogging, EasyLogConfig, LogLevels } from './shared.js';

export * from './index.browser.js'
export * from './async/stream.js'

/**
 * Parse a single DEBUG configuration entry
 * Handles both DEBUG=* and DEBUG=namespace=level formats
 */
function parseDebugEntry(entry: string, logConfig: EasyLogConfig, maxLogLevelRef: { value: LogLevels }): void
{
    const trimmed = entry.trim();
    if (trimmed === '*')
    {
        maxLogLevelRef.value = LogLevels.silly;
        return;
    }

    // Parse namespace=level format
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex !== -1)
    {
        const namespace = trimmed.substring(0, eqIndex);
        const levelName = trimmed.substring(eqIndex + 1);
        const levelValue = LogLevels[levelName as keyof typeof LogLevels];

        if (levelValue !== undefined)
        {
            // Build nested namespace config
            const parts = namespace.split(':');
            let current = logConfig;
            for (let i = 0; i < parts.length; i++)
            {
                if (i === parts.length - 1)
                {
                    // Last part - set the level
                    current[parts[i]] = levelValue;
                }
                else
                {
                    // Intermediate part - create nested object
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    current[parts[i]] ??= {};
                    current = current[parts[i]] as EasyLogConfig;
                }
            }
        }
    }
}

const logConfig: EasyLogConfig = {};
let maxLogLevel: LogLevels = LogLevels.prompt;
if (process.env.NODE_ENV !== 'production')
    maxLogLevel = LogLevels.debug;

const maxLogLevelRef = { value: maxLogLevel };

if (process.env.DEBUG)
    process.env.DEBUG.split(',').forEach(v => parseDebugEntry(v, logConfig, maxLogLevelRef));

maxLogLevel = maxLogLevelRef.value;
configureLogging({ defaultLevel: maxLogLevel, namespaceConfig: logConfig });
