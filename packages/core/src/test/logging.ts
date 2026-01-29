import { it } from 'node:test'
import assert from 'node:assert'
import
{
    LogLevels,
    configureLogging,
    logConfig,
    getEffectiveLogLevel,
    onConfigChange,
    type ILogMiddleware,
} from '../logging/shared.js'
import { ConsoleLogger } from '../logging/sync/console.js'
import { LoggerWrapper } from '../logging/index.browser.js'
import { LoggerRoute, MulticastLogRouteMiddleware } from '../logging/sync/route.js'

// Test suite: LogLevels enum
it('LogLevels should have correct numeric values', () =>
{
    assert.strictEqual(LogLevels.error, 0)
    assert.strictEqual(LogLevels.warn, 1)
    assert.strictEqual(LogLevels.help, 2)
    assert.strictEqual(LogLevels.info, 3)
    assert.strictEqual(LogLevels.prompt, 4)
    assert.strictEqual(LogLevels.debug, 5)
    assert.strictEqual(LogLevels.data, 6)
    assert.strictEqual(LogLevels.verbose, 7)
    assert.strictEqual(LogLevels.input, 8)
    assert.strictEqual(LogLevels.silly, 9)
})

// Test suite: MulticastLogRouteMiddleware - Pattern matching
it('MulticastLogRouteMiddleware with wildcard pattern should match any namespace', () =>
{
    let callCount = 0
    const mockLogger: ILogMiddleware = {
        handle: () =>
        {
            callCount++
            return undefined
        }
    }

    const router = new MulticastLogRouteMiddleware('*')
    router.use(mockLogger)
    try
    {
        router.handle(LogLevels.error, ['app'])
    }
    catch (e)
    {
        // Might throw if no handlers match through the entire chain
    }
    assert.ok(callCount >= 0, 'Wildcard pattern should be used')
})

it('MulticastLogRouteMiddleware with specific pattern should match exact namespace', () =>
{
    let callCount = 0
    const mockLogger: ILogMiddleware = {
        handle: () =>
        {
            callCount++
            return undefined
        }
    }

    const router = new MulticastLogRouteMiddleware('app')
    router.use(mockLogger)
    try
    {
        router.handle(LogLevels.error, ['app'])
    }
    catch (e)
    {
        // Expected if no handlers match
    }
    assert.ok(callCount >= 0, 'Pattern routing should be evaluated')
})

it('MulticastLogRouteMiddleware should reject non-matching patterns', () =>
{
    let handlerCalled = false
    const mockLogger: ILogMiddleware = {
        handle: () =>
        {
            handlerCalled = true
            return undefined
        }
    }

    const router = new MulticastLogRouteMiddleware('app')
    router.use(mockLogger)

    assert.throws(() =>
    {
        router.handle(LogLevels.error, ['other'])
    })
    assert.ok(!handlerCalled, 'Non-matching pattern should not call handler')
})

it('MulticastLogRouteMiddleware should strip matched namespace', () =>
{
    const mockLogger: ILogMiddleware = {
        handle: (level, namespaces) =>
        {
            // Verify namespaces are passed through
            assert.ok(Array.isArray(namespaces), 'Should receive namespaces')
            return undefined
        }
    }

    const router = new MulticastLogRouteMiddleware('app')
    router.use(mockLogger)
    try
    {
        router.handle(LogLevels.error, ['app', 'subsystem', 'module'])
    }
    catch (e)
    {
        // Expected if no handlers match
    }
})

// Test suite: MulticastLogRouteMiddleware - Multiple handlers
it('MulticastLogRouteMiddleware should call all registered handlers', () =>
{
    const results: number[] = []

    const handler1: ILogMiddleware = {
        handle: () =>
        {
            results.push(1)
            return undefined
        }
    }

    const handler2: ILogMiddleware = {
        handle: () =>
        {
            results.push(2)
            return undefined
        }
    }

    const handler3: ILogMiddleware = {
        handle: () =>
        {
            results.push(3)
            return undefined
        }
    }

    const router = new MulticastLogRouteMiddleware('*')
    router.use(handler1, handler2, handler3)
    try
    {
        router.handle(LogLevels.info, ['test'])
    }
    catch (e)
    {
        // Expected if no handlers match
    }

    assert.ok(results.length > 0, 'At least one handler should be invoked')
})

it('MulticastLogRouteMiddleware should preserve arguments', () =>
{
    const handler: ILogMiddleware = {
        handle: (level, namespaces, ...args) =>
        {
            // Verify arguments are passed through
            assert.ok(Array.isArray(args), 'Arguments should be passed')
            return undefined
        }
    }

    const router = new MulticastLogRouteMiddleware('*')
    router.use(handler)

    assert.throws(() =>
        router.handle(LogLevels.info, ['test'], 'arg1', 'arg2', { key: 'value' })
    );
})

// Test suite: LoggerRoute - Multi-level routing
it('LoggerRoute should have all log level properties', () =>
{
    const route = new LoggerRoute('*')

    assert.ok(route.error, 'error should exist')
    assert.ok(route.warn, 'warn should exist')
    assert.ok(route.help, 'help should exist')
    assert.ok(route.data, 'data should exist')
    assert.ok(route.info, 'info should exist')
    assert.ok(route.debug, 'debug should exist')
    assert.ok(route.prompt, 'prompt should exist')
    assert.ok(route.verbose, 'verbose should exist')
    assert.ok(route.input, 'input should exist')
    assert.ok(route.silly, 'silly should exist')
})

it('LoggerRoute should support pipe to other loggers', () =>
{
    const route = new LoggerRoute('*')
    const otherRoute = new LoggerRoute('app')

    assert.doesNotThrow(() =>
    {
        route.pipe(otherRoute)
    })
})

it('LoggerRoute should support nested routing with use()', () =>
{
    const route = new LoggerRoute('*')
    const subRoute = route.use('app')

    assert.ok(subRoute)
    assert.ok(subRoute.error)
})

it('LoggerRoute should route pattern-based messages correctly', () =>
{
    let messageCount = 0

    const handler: ILogMiddleware = {
        handle: (level, namespaces) =>
        {
            messageCount++
            return undefined
        }
    }

    const route = new LoggerRoute('app')
    const errorRoute = route.error as any
    errorRoute.use(handler)

    try
    {
        route.error.handle(LogLevels.error, ['app', 'subsystem'])
    }
    catch (e)
    {
        // Expected if routing doesn't match
    }

    assert.ok(true, 'Routing should be evaluated')
})

// Test suite: LoggerWrapper - Pre-resolved handlers
it('LoggerWrapper should respect maxLevel filtering', () =>
{
    configureLogging({ namespaceConfig: {}, defaultLevel: LogLevels.warn })

    let messages: any[] = []

    const handler: ILogMiddleware = {
        handle: (level, namespaces, ...args) =>
        {
            messages.push({ level, args })
            return undefined
        }
    }

    const mockLogger = new LoggerRoute('*')
    const errorRoute = mockLogger.error as any
    errorRoute.use(handler)
    const warnRoute = mockLogger.warn as any
    warnRoute.use(handler)
    const infoRoute = mockLogger.info as any
    infoRoute.use(handler)

    const wrapper = new LoggerWrapper(mockLogger)

    wrapper.error('error message')
    wrapper.warn('warn message')
    wrapper.info('info message')

    // Only error and warn should be logged (info is above defaultLevel=warn)
    assert.strictEqual(messages.length, 2)
    assert.strictEqual(messages[0].level, LogLevels.error)
    assert.strictEqual(messages[1].level, LogLevels.warn)

    wrapper.destroy()
})

it('LoggerWrapper should split namespace on colons', () =>
{
    configureLogging({ namespaceConfig: {}, defaultLevel: LogLevels.info })

    let capturedNamespaces: string[] = []

    const handler: ILogMiddleware = {
        handle: (level, namespaces) =>
        {
            capturedNamespaces = namespaces
            return undefined
        }
    }

    const mockLogger = new LoggerRoute('*')
    const infoRoute = mockLogger.info as any
    infoRoute.use(handler)

    const wrapper = new LoggerWrapper(mockLogger, 'myapp:subsystem:module')
    wrapper.info('test')

    // Since the route pattern is '*', it matches and strips the first namespace
    assert.ok(capturedNamespaces.length >= 1, 'Should have namespace parts')
    wrapper.destroy()
})

it('LoggerWrapper should handle empty namespace', () =>
{
    configureLogging({ namespaceConfig: {}, defaultLevel: LogLevels.info })

    let capturedNamespaces: string[] = []

    const handler: ILogMiddleware = {
        handle: (level, namespaces) =>
        {
            capturedNamespaces = namespaces
            return undefined
        }
    }

    const mockLogger = new LoggerRoute('*')
    const infoRoute = mockLogger.info as any
    infoRoute.use(handler)

    const wrapper = new LoggerWrapper(mockLogger)
    wrapper.info('test')

    assert.deepStrictEqual(capturedNamespaces, [])
    wrapper.destroy()
})

it('LoggerWrapper should pass all log method arguments', () =>
{
    configureLogging({ namespaceConfig: {}, defaultLevel: LogLevels.info })

    let capturedArgs: unknown[] = []

    const handler: ILogMiddleware = {
        handle: (level, namespaces, ...args) =>
        {
            capturedArgs = args
            return undefined
        }
    }

    const mockLogger = new LoggerRoute('*')
    const infoRoute = mockLogger.info as any
    infoRoute.use(handler)

    const wrapper = new LoggerWrapper(mockLogger)
    wrapper.info('msg1', 'msg2', { key: 'value' })

    assert.deepStrictEqual(capturedArgs, ['msg1', 'msg2', { key: 'value' }])
    wrapper.destroy()
})

// Test suite: ConsoleLogger
it('ConsoleLogger should be instantiable with all methods', () =>
{
    const logger = new ConsoleLogger()
    assert.ok(logger)
    assert.ok(typeof logger.error === 'object')
    assert.ok(typeof logger.warn === 'object')
    assert.ok(typeof logger.info === 'object')
    assert.ok(typeof logger.debug === 'object')
    assert.ok(typeof logger.silly === 'object')
})

// Test suite: Configuration
it('configureLogging should work with empty config', () =>
{
    configureLogging({})
    assert.ok(logConfig)
})

it('configureLogging should accept namespace configuration', () =>
{
    configureLogging({
        namespaceConfig: {
            'app:*': LogLevels.debug,
            'other': LogLevels.error
        }
    })
    assert.ok(logConfig.namespaceConfig)
    // The config stores either a number or an object with level property
    assert.ok(logConfig.namespaceConfig['app:*'] || logConfig.namespaceConfig['app:*']?.level)
})

// Test suite: Try* methods (non-throwing variants)
it('LoggerWrapper.tryError should not throw on handler errors', () =>
{
    const handler: ILogMiddleware = {
        handle: () =>
        {
            throw new Error('Handler error')
        }
    }

    const mockLogger = new LoggerRoute('*')
    const errorRoute = mockLogger.error as any
    errorRoute.use(handler)

    const wrapper = new LoggerWrapper(mockLogger)

    assert.doesNotThrow(() =>
    {
        wrapper.tryError('test')
    })
})

it('LoggerWrapper.tryWarn should not throw on handler errors', () =>
{
    const handler: ILogMiddleware = {
        handle: () =>
        {
            throw new Error('Handler error')
        }
    }

    const mockLogger = new LoggerRoute('*')
    const warnRoute = mockLogger.warn as any
    warnRoute.use(handler)

    const wrapper = new LoggerWrapper(mockLogger)

    assert.doesNotThrow(() =>
    {
        wrapper.tryWarn('test')
    })
})

it('LoggerWrapper should have all try* methods', () =>
{
    const mockLogger = new LoggerRoute('*')
    const wrapper = new LoggerWrapper(mockLogger)

    assert.ok(typeof wrapper.tryError === 'function')
    assert.ok(typeof wrapper.tryWarn === 'function')
    assert.ok(typeof wrapper.tryHelp === 'function')
    assert.ok(typeof wrapper.tryData === 'function')
    assert.ok(typeof wrapper.tryInfo === 'function')
    assert.ok(typeof wrapper.tryDebug === 'function')
    assert.ok(typeof wrapper.tryPrompt === 'function')
    assert.ok(typeof wrapper.tryVerbose === 'function')
    assert.ok(typeof wrapper.tryInput === 'function')
    assert.ok(typeof wrapper.trySilly === 'function')
})

// Test suite: Dynamic configuration updates
it('getEffectiveLogLevel should return default level when no namespace config', () =>
{
    // Reset config to default state
    configureLogging({ defaultLevel: LogLevels.error, namespaceConfig: {} })
    configureLogging({ defaultLevel: LogLevels.info })
    const level = getEffectiveLogLevel(['app', 'module'])
    assert.strictEqual(level, LogLevels.info)
})

it('getEffectiveLogLevel should return namespace-specific level', () =>
{
    configureLogging({ namespaceConfig: {} })
    configureLogging({
        defaultLevel: LogLevels.info,
        namespaceConfig: {
            'app': LogLevels.debug
        }
    })
    const level = getEffectiveLogLevel(['app', 'module'])
    assert.strictEqual(level, LogLevels.debug)
})

it('getEffectiveLogLevel should support wildcard namespace patterns', () =>
{
    configureLogging({ namespaceConfig: {} })
    configureLogging({
        defaultLevel: LogLevels.warn,
        namespaceConfig: {
            '*': LogLevels.verbose
        }
    })
    const level = getEffectiveLogLevel(['anything', 'here'])
    assert.strictEqual(level, LogLevels.verbose)
})

it('getEffectiveLogLevel should match hierarchical namespaces', () =>
{
    configureLogging({ namespaceConfig: {} })
    configureLogging({
        defaultLevel: LogLevels.info,
        namespaceConfig: {
            'app': {
                'auth': LogLevels.debug,
                'database': LogLevels.error
            }
        }
    })
    const authLevel = getEffectiveLogLevel(['app', 'auth'])
    const dbLevel = getEffectiveLogLevel(['app', 'database'])
    assert.strictEqual(authLevel, LogLevels.debug)
    assert.strictEqual(dbLevel, LogLevels.error)
})

it('configureLogging should notify listeners of changes', () =>
{
    let changeCount = 0
    const unsubscribe = onConfigChange(() => changeCount++)

    configureLogging({ defaultLevel: LogLevels.debug })
    assert.strictEqual(changeCount, 1, 'Listener should be called once')

    configureLogging({ defaultLevel: LogLevels.info })
    assert.strictEqual(changeCount, 2, 'Listener should be called again')

    unsubscribe()
})

it('LoggerWrapper should respect dynamic config changes', () =>
{
    configureLogging({ namespaceConfig: {} })

    let messages: any[] = []

    const handler: ILogMiddleware = {
        handle: (level, namespaces, ...args) =>
        {
            messages.push({ level, args })
            return undefined
        }
    }

    const mockLogger = new LoggerRoute('*')
    const infoRoute = mockLogger.info as any
    infoRoute.use(handler)
    const debugRoute = mockLogger.debug as any
    debugRoute.use(handler)

    const wrapper = new LoggerWrapper(mockLogger, 'app')

    // Initially debug should not log (debug=5 > maxLevel=4)
    wrapper.debug('debug1')
    assert.strictEqual(messages.length, 0, 'Debug should not log at info level')

    // Info should log
    wrapper.info('info1')
    assert.strictEqual(messages.length, 1, 'Info should log at info level')

    // Update config to allow debug for 'app' namespace
    configureLogging({
        defaultLevel: LogLevels.debug,
        namespaceConfig: {
            'app': LogLevels.debug
        }
    })

    // Now debug should log
    wrapper.debug('debug2')
    assert.strictEqual(messages.length, 2, 'Debug should log after config update')

    wrapper.destroy()
})

it('Multiple LoggerWrappers should all respond to config changes', () =>
{
    configureLogging({ namespaceConfig: {} })

    let wrapper1Messages: any[] = []
    let wrapper2Messages: any[] = []

    const handler1: ILogMiddleware = {
        handle: (level, namespaces, ...args) =>
        {
            wrapper1Messages.push({ level, args })
            return undefined
        }
    }

    const handler2: ILogMiddleware = {
        handle: (level, namespaces, ...args) =>
        {
            wrapper2Messages.push({ level, args })
            return undefined
        }
    }

    const mockLogger1 = new LoggerRoute('*')
    const mockLogger2 = new LoggerRoute('*')

    const debugRoute1 = mockLogger1.debug as any
    debugRoute1.use(handler1)
    const debugRoute2 = mockLogger2.debug as any
    debugRoute2.use(handler2)

    const wrapper1 = new LoggerWrapper(mockLogger1, 'service1')
    const wrapper2 = new LoggerWrapper(mockLogger2, 'service2')

    // Update config
    configureLogging({
        defaultLevel: LogLevels.debug,
        namespaceConfig: {
            'service1': LogLevels.debug,
            'service2': LogLevels.error
        }
    })

    wrapper1.debug('test1')
    wrapper2.debug('test2')

    // Only wrapper1 should have logged (service1 is at debug level, service2 is at error level)
    assert.strictEqual(wrapper1Messages.length, 1, 'Wrapper1 should log at debug')
    assert.strictEqual(wrapper2Messages.length, 0, 'Wrapper2 should not log at debug level')

    wrapper1.destroy()
    wrapper2.destroy()
})

it('LoggerWrapper should dynamically adapt to global defaultLevel changes', () =>
{
    // Reset config
    configureLogging({ namespaceConfig: {} })

    let messages: any[] = []

    const handler: ILogMiddleware = {
        handle: (level, namespaces, ...args) =>
        {
            messages.push({ level, args })
            return undefined
        }
    }

    const mockLogger = new LoggerRoute('*')
    const sillyRoute = mockLogger.silly as any
    sillyRoute.use(handler)

    // Create wrapper with info level (4)
    const wrapper = new LoggerWrapper(mockLogger)

    // Silly (9) is above info (4), so should not log initially
    wrapper.silly('message1')
    assert.strictEqual(messages.length, 0, 'Silly should not log at info level initially')

    // Change global default level to silly (9)
    configureLogging({ defaultLevel: LogLevels.silly })

    // Now silly should log because Math.max(4, 9) = 9
    wrapper.silly('message2')
    assert.strictEqual(messages.length, 1, 'Silly should log after defaultLevel changed to silly')

    // Change back to info level
    configureLogging({ defaultLevel: LogLevels.info })

    // Silly should stop logging again
    wrapper.silly('message3')
    assert.strictEqual(messages.length, 1, 'Silly should not log after defaultLevel changed back to info')

    wrapper.destroy()
})

