import { calculator } from './calculator'
import * as assert from 'assert'
import { EventProcessor } from '../processors/event';
import { Local } from '../processors';
import { Container } from '../container';

describe('test event processing', function ()
{
    it('should handle basics', async function ()
    {
        var oldProcessor = calculator.processor;
        var processor = new EventProcessor(oldProcessor);
        calculator.processor = processor;
        var processingCalled: string | undefined;
        var processedCalled: string | undefined;
        processor.once('processing', function (cmd)
        {
            processingCalled = cmd.name;
        })
        processor.once('processed', function (cmd)
        {
            processedCalled = cmd.name;
        })
        await calculator.dispatch('reset');
        assert.strictEqual(processingCalled, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled, 'reset', 'processed was not called')
        calculator.processor = oldProcessor;
    })
})