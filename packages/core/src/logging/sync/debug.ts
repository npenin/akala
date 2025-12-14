import * as debugImport from "debug";
import { ILogMiddleware, ILogger, LogLevels } from "../shared.js";

// Polyfill for debug import (browser vs non browser)
const debug = debugImport.default ?? debugImport.debug

/**
 * Debug-based implementation of ILoggerAdapter using debug package
 * @implements ILogger
 */
// @logger.service('debug')
export class DebugLogger implements ILogger
{
    private debugInstance: debug.Debugger;
    private currentLevel: LogLevels = LogLevels.info;
    private levelLoggers: Map<LogLevels, debug.Debugger> = new Map();

    constructor(namespace: string)
    {
        this.debugInstance = debug(namespace);
        this.initializeLevelLoggers(namespace);
    }

    private initializeLevelLoggers(namespace: string): void
    {
        Object.values(LogLevels).forEach(level =>
        {
            if (typeof level === 'number')
            {
                const levelName = LogLevels[level] as keyof typeof LogLevels;
                this.levelLoggers.set(level, this.debugInstance.extend(levelName));
            }
        });
    }

    private make(level: LogLevels): ILogMiddleware
    {
        return new Proxy(this.levelLoggers.get(level), {
            get: (target, prop) =>
            {
                if (prop === 'isEnabled')
                {
                    return this.isEnabled(level) && this.levelLoggers.get(level)!.enabled;
                }
                return (target as any)[prop];
            }
        }) as unknown as ILogMiddleware;
    }

    get error() { return this.make(LogLevels.error); }
    get warn() { return this.make(LogLevels.warn); }
    get help() { return this.make(LogLevels.help); }
    get data() { return this.make(LogLevels.data); }
    get info() { return this.make(LogLevels.info); }
    get debug() { return this.make(LogLevels.debug); }
    get prompt() { return this.make(LogLevels.prompt); }
    get verbose() { return this.make(LogLevels.verbose); }
    get input() { return this.make(LogLevels.input); }
    get silly() { return this.make(LogLevels.silly); }

    isEnabled(level: LogLevels): boolean
    {
        return level >= this.currentLevel;
    }

    setLevel(level: LogLevels): void
    {
        this.currentLevel = level;
        this.updateDebugNamespaces();
    }

    getLevel(): LogLevels
    {
        return this.currentLevel;
    }

    private updateDebugNamespaces(): void
    {
        const namespaces: string[] = [];
        Object.keys(LogLevels).forEach(key =>
        {
            if (!isNaN(Number(key)))
                return;
            if (LogLevels[key] <= this.currentLevel)
            {
                namespaces.push(key + ':' + this.debugInstance.namespace);
            }
        });
        debug.enable(namespaces.join(','));
    }
}
