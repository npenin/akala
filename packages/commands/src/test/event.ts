import { calculator } from './calculator'
import * as assert from 'assert'
import { EventProcessor } from '../processors/event';
import { Local } from '../processors';
import { Container } from '../model/container';

describe('test event processing', function ()
{
    it('should handle basics', async function ()
    {
        var processor = new EventProcessor(calculator.processor);
        var calculator2 = new Container(calculator.name, calculator.state, processor);
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
        await calculator2.dispatch('reset');
        assert.strictEqual(processingCalled, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled, 'reset', 'processed was not called')
    })
})