import { calculator } from './calculator'
import * as assert from 'assert'
import { Local, LogProcessor } from '../processors';

describe('test log processing', function ()
{
    it('should handle basics', async function ()
    {
        var oldProcessor = calculator.processor;
        var processor = new LogProcessor(oldProcessor, function (cmd)
        {
            processingCalled = cmd.name;
        }, function (cmd)
            {
                processedCalled = cmd.name;
            });
        calculator.processor = processor;
        var processingCalled: string | undefined;
        var processedCalled: string | undefined;
        await calculator.dispatch('reset');
        assert.strictEqual(processingCalled, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled, 'reset', 'processed was not called')
        calculator.processor = oldProcessor;
    })
})