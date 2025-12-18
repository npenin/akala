import { it } from 'node:test'
import assert from 'assert'
import
{
    LogLevels,
    LoggerMiddleware,
    LogMiddlewareWrapper,
    LoggerAdapterMiddleware,
    configureLogging,
    logConfig,
    type ILogger,
    type ILogMiddleware,
} from '../logging/shared.js'
import { ConsoleLogger } from '../logging/sync/console.js'
import { LoggerLogMiddlewareWrapper } from '../logging/sync/wrapper.js'

// Test suite: LogLevels enum
it('LogLevels should have correct numeric values', () =>
{
    assert.strictEqual(LogLevels.error, 0)
    assert.strictEqual(LogLevels.warn, 1)
    assert.strictEqual(LogLevels.help, 2)
    assert.strictEqual(LogLevels.data, 3)
    assert.strictEqual(LogLevels.info, 4)
    assert.strictEqual(LogLevels.debug, 5)
    assert.strictEqual(LogLevels.prompt, 6)
    assert.strictEqual(LogLevels.verbose, 7)
    assert.strictEqual(LogLevels.input, 8)
    assert.strictEqual(LogLevels.silly, 9)
})

// Test suite: LoggerMiddleware
it('LoggerMiddleware should call handler when shouldHandle returns true', () =>
{
    let handlerCalled = false
    const handler = (): void =>
    {
        handlerCalled = true
    }

    const middleware = new LoggerMiddleware(handler, LogLevels.info, 'app')
    middleware.handle(LogLevels.error, ['app'])

    assert.ok(handlerCalled, 'Handler should be called when shouldHandle returns true')
})

it('LoggerMiddleware should not call handler when log level is too low', () =>
{
    let handlerCalled = false
    const handler = (): void =>
    {
        handlerCalled = true
    }

    const middleware = new LoggerMiddleware(handler, LogLevels.debug, '*')
    const result = middleware.handle(LogLevels.silly, ['test'])

    assert.ok(!handlerCalled, 'Handler should not be called when log level is too low')
    assert.strictEqual(result, undefined)
})

it('LoggerMiddleware should not call handler when namespace does not match', () =>
{
    let handlerCalled = false
    const handler = (): void =>
    {
        handlerCalled = true
    }

    const middleware = new LoggerMiddleware(handler, LogLevels.error, 'app')
    const result = middleware.handle(LogLevels.error, ['other'])

    assert.ok(!handlerCalled, 'Handler should not be called when namespace does not match')
    assert.strictEqual(result, undefined)
})

it('LoggerMiddleware should call handler with wildcard namespace', () =>
{
    let handlerCalled = false
    const handler = (): void =>
    {
        handlerCalled = true
    }

    const middleware = new LoggerMiddleware(handler, LogLevels.info, '*')
    middleware.handle(LogLevels.error, ['arbitrary', 'namespace'])

    // With wildcard, namespace matches and level allows, so handler is called
    assert.ok(handlerCalled)
})

it('LoggerMiddleware.shouldHandle should return true when conditions are met', () =>
{
    const handler = (): void => { }
    const middleware = new LoggerMiddleware(handler, LogLevels.warn, 'app')

    assert.ok(middleware.shouldHandle(LogLevels.warn, ['app']))
    assert.ok(middleware.shouldHandle(LogLevels.error, ['app']))
})

it('LoggerMiddleware.shouldHandle should return false when log level is too low', () =>
{
    const handler = (): void => { }
    const middleware = new LoggerMiddleware(handler, LogLevels.warn, 'app')

    assert.ok(!middleware.shouldHandle(LogLevels.info, ['app']))
})

it('LoggerMiddleware.shouldHandle should return false for non-matching namespace', () =>
{
    const handler = (): void => { }
    const middleware = new LoggerMiddleware(handler, LogLevels.error, 'app')

    assert.ok(!middleware.shouldHandle(LogLevels.error, ['other']))
})

it('LoggerMiddleware should pass all arguments to handler when shouldHandle is true', () =>
{
    const capturedArgs: unknown[] = []
    const handler = (logLevel: LogLevels, namespaces: string[], ...args: unknown[]): void =>
    {
        capturedArgs.push(logLevel, namespaces, ...args)
    }

    const middleware = new LoggerMiddleware(handler, LogLevels.debug, 'app')
    const testValue = { key: 'value' }
    // Matching namespace and sufficient level triggers handler
    middleware.handle(LogLevels.debug, ['app'], 'message', testValue, 42)

    assert.strictEqual(capturedArgs[0], LogLevels.debug)
    assert.deepStrictEqual(capturedArgs[1], ['app'])
    assert.strictEqual(capturedArgs[2], 'message')
    assert.deepStrictEqual(capturedArgs[3], testValue)
    assert.strictEqual(capturedArgs[4], 42)
})

it('LoggerMiddleware should have public properties for logLevel and namespace', () =>
{
    const handler = (): void => { }
    const middleware = new LoggerMiddleware(handler, LogLevels.warn, 'testNamespace')

    assert.strictEqual(middleware.logLevel, LogLevels.warn)
    assert.strictEqual(middleware.namespace, 'testNamespace')
})

// Test suite: LogMiddlewareWrapper
it('LogMiddlewareWrapper should delegate to wrapped logger when conditions match', () =>
{
    let delegateCalled = false
    const mockLogger = {
        handle: (): void =>
        {
            delegateCalled = true
        },
        shouldHandle: () => true,
    } as any as ILogMiddleware

    const wrapper = new LogMiddlewareWrapper(mockLogger, LogLevels.error, 'app')
    // error (0) matches, app matches, wrapped logger says yes
    wrapper.handle(LogLevels.error, ['app'])

    assert.ok(delegateCalled, 'Should delegate to wrapped logger when all conditions match')
})

it('LogMiddlewareWrapper should not delegate when log level is too low', () =>
{
    let delegateCalled = false
    const mockLogger = {
        handle: (): void =>
        {
            delegateCalled = true
        },
        shouldHandle: () => true,
    } as any as ILogMiddleware

    const wrapper = new LogMiddlewareWrapper(mockLogger, LogLevels.debug, 'app')
    // debug (5) < silly (9), so shouldHandle returns false
    const result = wrapper.handle(LogLevels.silly, ['app'])

    assert.ok(!delegateCalled, 'Should not delegate when log level is too low')
    assert.strictEqual(result, undefined)
})

it('LogMiddlewareWrapper should not delegate when namespace does not match', () =>
{
    let delegateCalled = false
    const mockLogger = {
        handle: (): void =>
        {
            delegateCalled = true
        },
        shouldHandle: () => true,
    } as any as ILogMiddleware

    const wrapper = new LogMiddlewareWrapper(mockLogger, LogLevels.error, 'app')
    const result = wrapper.handle(LogLevels.error, ['other'])

    assert.ok(!delegateCalled, 'Should not delegate when namespace does not match')
    assert.strictEqual(result, undefined)
})

it('LogMiddlewareWrapper.shouldHandle should check level first', () =>
{
    const mockLogger = {
        handle: (): void => { },
        shouldHandle: () => true,
    } as any as ILogMiddleware

    const wrapper = new LogMiddlewareWrapper(mockLogger, LogLevels.debug, 'app')

    // Should return false when level condition fails
    assert.ok(!wrapper.shouldHandle(LogLevels.silly, ['app']))
})

it('LogMiddlewareWrapper.shouldHandle should check namespace and delegate to wrapped logger', () =>
{
    let delegateChecked = false
    const wrappedShouldHandle = (level: LogLevels, namespaces: string[]): boolean =>
    {
        delegateChecked = true
        return true
    }

    const mockLogger = {
        handle: (): void => { },
        shouldHandle: wrappedShouldHandle,
    } as any as ILogMiddleware

    const wrapper = new LogMiddlewareWrapper(mockLogger, LogLevels.info, '*')

    // When level and namespace match wildcard, should delegate to wrapped logger
    wrapper.shouldHandle(LogLevels.error, ['test'])
    assert.ok(delegateChecked, 'Should delegate to wrapped logger when wrapper conditions are met')
})

it('LogMiddlewareWrapper should have public properties', () =>
{
    const mockLogger = {
        handle: (): void => { },
        shouldHandle: () => true,
    } as any as ILogMiddleware

    const wrapper = new LogMiddlewareWrapper(mockLogger, LogLevels.warn, 'testNamespace')

    assert.strictEqual(wrapper.logLevel, LogLevels.warn)
    assert.strictEqual(wrapper.namespace, 'testNamespace')
})

// Test suite: ConsoleLogger
it('ConsoleLogger should be a singleton', () =>
{
    const logger1 = new ConsoleLogger()
    const logger2 = new ConsoleLogger()

    assert.strictEqual(logger1, logger2)
})

it('ConsoleLogger should have all log level methods', () =>
{
    const logger = new ConsoleLogger()

    assert.ok(logger.error)
    assert.ok(logger.warn)
    assert.ok(logger.help)
    assert.ok(logger.data)
    assert.ok(logger.info)
    assert.ok(logger.debug)
    assert.ok(logger.prompt)
    assert.ok(logger.verbose)
    assert.ok(logger.input)
    assert.ok(logger.silly)
})

it('ConsoleLogger should track log level independently', () =>
{
    const logger = new ConsoleLogger()
    const originalLevel = logger.getLevel()

    logger.setLevel(LogLevels.warn)
    assert.strictEqual(logger.getLevel(), LogLevels.warn)

    // Reset for other tests
    logger.setLevel(originalLevel)
})

it('ConsoleLogger.isEnabled should compare levels correctly', () =>
{
    const logger = new ConsoleLogger()
    const originalLevel = logger.getLevel()

    logger.setLevel(LogLevels.info)

    // isEnabled returns level >= currentLevel
    // info (4) >= info (4) = true
    assert.ok(logger.isEnabled(LogLevels.info))
    // error (0) >= info (4) = false
    assert.ok(!logger.isEnabled(LogLevels.error))

    // Reset
    logger.setLevel(originalLevel)
})

it('ConsoleLogger.isEnabled with error level set', () =>
{
    const logger = new ConsoleLogger()
    const originalLevel = logger.getLevel()

    logger.setLevel(LogLevels.error)

    // error (0) >= error (0) = true
    assert.ok(logger.isEnabled(LogLevels.error))
    // warn (1) >= error (0) = true
    assert.ok(logger.isEnabled(LogLevels.warn))
    // info (4) >= error (0) = true (all levels are >= 0)
    assert.ok(logger.isEnabled(LogLevels.info))

    // Reset
    logger.setLevel(originalLevel)
})

// Test suite: LoggerLogMiddlewareWrapper
it('LoggerLogMiddlewareWrapper should wrap all log levels', () =>
{
    const mockLogger = {
        handle: (): void => { },
        shouldHandle: () => true,
    } as any as ILogMiddleware

    const wrapper = new LoggerLogMiddlewareWrapper(mockLogger)

    assert.ok(wrapper.error)
    assert.ok(wrapper.warn)
    assert.ok(wrapper.help)
    assert.ok(wrapper.data)
    assert.ok(wrapper.info)
    assert.ok(wrapper.debug)
    assert.ok(wrapper.prompt)
    assert.ok(wrapper.verbose)
    assert.ok(wrapper.input)
    assert.ok(wrapper.silly)
})

it('LoggerLogMiddlewareWrapper should create correct log level wrappers', () =>
{
    const mockLogger = {
        handle: (): void => { },
        shouldHandle: () => true,
    } as any as ILogMiddleware

    const wrapper = new LoggerLogMiddlewareWrapper(mockLogger)

    assert.strictEqual((wrapper.error as any).logLevel, LogLevels.error)
    assert.strictEqual((wrapper.warn as any).logLevel, LogLevels.warn)
    assert.strictEqual((wrapper.info as any).logLevel, LogLevels.info)
    assert.strictEqual((wrapper.silly as any).logLevel, LogLevels.silly)
})

// Test suite: configureLogging
it('configureLogging should update default log level', () =>
{
    const originalLevel = logConfig.defaultLevel
    try
    {
        configureLogging({ defaultLevel: LogLevels.debug })
        assert.strictEqual(logConfig.defaultLevel, LogLevels.debug)
    } finally
    {
        logConfig.defaultLevel = originalLevel
    }
})

it('configureLogging should merge namespace configuration', () =>
{
    const originalConfig = JSON.parse(JSON.stringify(logConfig.namespaceConfig))
    try
    {
        configureLogging({
            namespaceConfig: {
                app: LogLevels.debug,
                db: LogLevels.silly,
            },
        })

        assert.ok(logConfig.namespaceConfig['app'])
        assert.ok(logConfig.namespaceConfig['db'])
    } finally
    {
        logConfig.namespaceConfig = originalConfig
    }
})

it('configureLogging should support nested namespace configuration', () =>
{
    const originalConfig = JSON.parse(JSON.stringify(logConfig.namespaceConfig))
    try
    {
        configureLogging({
            namespaceConfig: {
                app: {
                    database: LogLevels.silly,
                    api: LogLevels.debug,
                },
            },
        })

        assert.ok(logConfig.namespaceConfig['app'])
    } finally
    {
        logConfig.namespaceConfig = originalConfig
    }
})

it('configureLogging with no arguments should not crash', () =>
{
    const originalLevel = logConfig.defaultLevel
    const originalConfig = JSON.parse(JSON.stringify(logConfig.namespaceConfig))
    try
    {
        configureLogging({})
        assert.strictEqual(logConfig.defaultLevel, originalLevel)
    } finally
    {
        logConfig.defaultLevel = originalLevel
        logConfig.namespaceConfig = originalConfig
    }
})

// Test suite: LoggerAdapterMiddleware
it('LoggerAdapterMiddleware should delegate to correct log level method', () =>
{
    const callStack: string[] = []

    const mockLogger = {
        error: {
            handle: (): void =>
            {
                callStack.push('error')
            },
            shouldHandle: () => true,
        },
        warn: {
            handle: (): void =>
            {
                callStack.push('warn')
            },
            shouldHandle: () => true,
        },
        info: {
            handle: (): void =>
            {
                callStack.push('info')
            },
            shouldHandle: () => true,
        },
        help: { handle: (): void => { }, shouldHandle: () => true },
        data: { handle: (): void => { }, shouldHandle: () => true },
        debug: { handle: (): void => { }, shouldHandle: () => true },
        prompt: { handle: (): void => { }, shouldHandle: () => true },
        verbose: { handle: (): void => { }, shouldHandle: () => true },
        input: { handle: (): void => { }, shouldHandle: () => true },
        silly: { handle: (): void => { }, shouldHandle: () => true },
    } as any as ILogger

    const adapter = new LoggerAdapterMiddleware(mockLogger)

    adapter.handle(LogLevels.error, ['test'], 'error message')
    adapter.handle(LogLevels.warn, ['test'], 'warning message')
    adapter.handle(LogLevels.info, ['test'], 'info message')

    assert.deepStrictEqual(callStack, ['error', 'warn', 'info'])
})

it('LoggerAdapterMiddleware should pass all arguments to handler', () =>
{
    const capturedArgs: unknown[] = []

    const mockLogger = {
        error: {
            handle: (level: LogLevels, namespaces: string[], ...args: unknown[]): void =>
            {
                capturedArgs.push(level, namespaces, ...args)
            },
            shouldHandle: () => true,
        },
        warn: { handle: (): void => { }, shouldHandle: () => true },
        help: { handle: (): void => { }, shouldHandle: () => true },
        data: { handle: (): void => { }, shouldHandle: () => true },
        info: { handle: (): void => { }, shouldHandle: () => true },
        debug: { handle: (): void => { }, shouldHandle: () => true },
        prompt: { handle: (): void => { }, shouldHandle: () => true },
        verbose: { handle: (): void => { }, shouldHandle: () => true },
        input: { handle: (): void => { }, shouldHandle: () => true },
        silly: { handle: (): void => { }, shouldHandle: () => true },
    } as any as ILogger

    const adapter = new LoggerAdapterMiddleware(mockLogger)
    const testObj = { data: 'test' }

    adapter.handle(LogLevels.error, ['app', 'service'], 'message', testObj, 123)

    assert.strictEqual(capturedArgs[0], LogLevels.error)
    assert.deepStrictEqual(capturedArgs[1], ['app', 'service'])
    assert.strictEqual(capturedArgs[2], 'message')
    assert.deepStrictEqual(capturedArgs[3], testObj)
    assert.strictEqual(capturedArgs[4], 123)
})

it('LoggerAdapterMiddleware should handle all log levels', () =>
{
    const levels: LogLevels[] = []

    const mockLogger = {
        error: {
            handle: (): void =>
            {
                levels.push(LogLevels.error)
            },
            shouldHandle: () => true,
        },
        warn: {
            handle: (): void =>
            {
                levels.push(LogLevels.warn)
            },
            shouldHandle: () => true,
        },
        help: {
            handle: (): void =>
            {
                levels.push(LogLevels.help)
            },
            shouldHandle: () => true,
        },
        data: {
            handle: (): void =>
            {
                levels.push(LogLevels.data)
            },
            shouldHandle: () => true,
        },
        info: {
            handle: (): void =>
            {
                levels.push(LogLevels.info)
            },
            shouldHandle: () => true,
        },
        debug: {
            handle: (): void =>
            {
                levels.push(LogLevels.debug)
            },
            shouldHandle: () => true,
        },
        prompt: {
            handle: (): void =>
            {
                levels.push(LogLevels.prompt)
            },
            shouldHandle: () => true,
        },
        verbose: {
            handle: (): void =>
            {
                levels.push(LogLevels.verbose)
            },
            shouldHandle: () => true,
        },
        input: {
            handle: (): void =>
            {
                levels.push(LogLevels.input)
            },
            shouldHandle: () => true,
        },
        silly: {
            handle: (): void =>
            {
                levels.push(LogLevels.silly)
            },
            shouldHandle: () => true,
        },
    } as any as ILogger

    const adapter = new LoggerAdapterMiddleware(mockLogger)

    Object.values(LogLevels)
        .filter((v): v is LogLevels => typeof v === 'number')
        .forEach((level) =>
        {
            adapter.handle(level, ['test'])
        })

    assert.deepStrictEqual(levels.sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
})

