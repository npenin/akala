import { calculator } from './calculator/index.js'
import * as assert from 'assert'
import { Pipe, EventProcessor } from '../processors/index.js';
import { Container } from '../model/container.js';
import { metadata, registerCommands } from '../generator.js';

describe('test event processing', function ()
{
    it('should handle basics', async function ()
    {
        const processor = new EventProcessor(new Pipe(calculator));
        const calculator2 = new Container(calculator.name, calculator.state);
        calculator2.processor.useMiddleware(3, processor);
        registerCommands(metadata(calculator).commands, null, calculator2);
        let processingCalled: string | undefined;
        let processedCalled: string | undefined;
        processor.once('processing', function (_container, cmd)
        {
            processingCalled = cmd.name;
        })
        processor.once('processed', function (_container, cmd)
        {
            processedCalled = cmd.name;
        })
        await calculator2.dispatch('reset');
        assert.strictEqual(processingCalled, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled, 'reset', 'processed was not called')
    })
})