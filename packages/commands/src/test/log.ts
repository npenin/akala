import { calculator } from './calculator/index.js'
import * as assert from 'assert'
import { LogEventProcessor, Pipe } from '../processors/index.js';
import { Container } from '../model/container.js';
import { Command } from '../metadata/index.js';
import { registerCommands } from '../generator.js';

describe('test log processing', function ()
{
    it('should handle basics', async function ()
    {
        const processor = new LogEventProcessor(new Pipe(calculator), function (_, cmd)
        {
            processingCalled = cmd;
            return Promise.resolve();
        }, function (_, cmd)
        {
            processedCalled = cmd;
            return Promise.resolve();
        });
        const calculator2 = new Container(calculator.name, calculator.state);
        registerCommands((await calculator.dispatch('$metadata')).commands, null, calculator2);
        calculator2.processor.useMiddleware(20, processor);
        let processingCalled: Command;
        let processedCalled: Command;
        await calculator2.dispatch('reset');
        assert.strictEqual(processingCalled.name, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled.name, 'reset', 'processed was not called')
    })
})