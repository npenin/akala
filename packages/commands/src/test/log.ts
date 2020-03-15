import { calculator } from './calculator'
import * as assert from 'assert'
import { Local, LogProcessor } from '../processors';
import { Container } from '../model/container';

describe('test log processing', function ()
{
    it('should handle basics', async function ()
    {
        var processor = new LogProcessor(calculator.processor, function (cmd)
        {
            processingCalled = cmd.name;
        }, function (cmd)
        {
            processedCalled = cmd.name;
        });
        var calculator2 = new Container(calculator.name, calculator.state, processor);
        var processingCalled: string | undefined;
        var processedCalled: string | undefined;
        await calculator2.dispatch('reset');
        assert.strictEqual(processingCalled, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled, 'reset', 'processed was not called')
    })
})