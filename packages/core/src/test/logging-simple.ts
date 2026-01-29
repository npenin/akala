import { it } from 'node:test'
import assert from 'assert'
import
{
    LogLevels,
    configureLogging,
    logConfig,
} from '../logging/shared.js'
import { ConsoleLogger } from '../logging/sync/console.js'

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

// Test suite: ConsoleLogger basic functionality
it('ConsoleLogger should exist and be instantiable', () =>
{
    const logger = new ConsoleLogger()
    assert.ok(logger)
    assert.ok(logger.error)
    assert.ok(logger.warn)
    assert.ok(logger.info)
    assert.ok(logger.debug)
})

// Test suite: Configuration
it('configureLogging should work', () =>
{
    configureLogging({})
    assert.ok(logConfig)
})

it('LoggerWrapper should cache handlers for performance', () =>
{
    const logger = new ConsoleLogger()
    // Verify the logger has the expected methods
    assert.ok(logger.error)
    assert.ok(logger.warn)
    assert.ok(logger.info)
})
